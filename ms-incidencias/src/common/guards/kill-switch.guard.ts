import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Guardián de Kill Switch para MS-Incidencias (TAL-4 & TAL-210)
 *
 * Intercepta peticiones mutantes (POST, PUT, PATCH, DELETE) cuando la bandera
 * KILL_SWITCH_INCIDENCIAS_ENABLED o KILL_SWITCH_ENABLED está activa.
 * Soporta conmutación en caliente mediante archivo .env en disco o estado en memoria
 * sin reiniciar el contenedor, arrancando siempre en modo seguro (false) por defecto.
 */
@Injectable()
export class KillSwitchGuard implements CanActivate {
  private hotOverride: boolean | null = null;
  private hotMotivo: string | null = null;

  canActivate(context: ExecutionContext): boolean {
    if (!this.isKillSwitchActive()) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const method = (request.method || '').toUpperCase();
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    // Solo bloquea operaciones mutantes; permite lectura segura (GET, HEAD, OPTIONS)
    if (mutatingMethods.includes(method)) {
      const response = http.getResponse<Response>();
      if (response && typeof response.setHeader === 'function') {
        response.setHeader('X-Kill-Switch', 'true');
      }

      const motivo = this.getMotivo();

      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'Service Unavailable',
          mensaje: motivo,
          motivo,
          killSwitch: true,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return true;
  }

  /**
   * Evalúa el estado vigente del Kill Switch con soporte de recarga en caliente:
   * 1. Override en memoria (conmutación vía API administrativa)
   * 2. Archivo .env en disco (recarga en caliente de configuración sin reiniciar contenedor)
   * 3. Variables de entorno del proceso (process.env)
   * 4. Arranque por defecto en modo seguro: false
   */
  public isKillSwitchActive(): boolean {
    if (this.hotOverride !== null) {
      return this.hotOverride;
    }

    const diskFlag = this.readEnvVariableFromDisk('KILL_SWITCH_INCIDENCIAS_ENABLED')
      ?? this.readEnvVariableFromDisk('KILL_SWITCH_ENABLED');

    if (diskFlag !== null) {
      return this.parseBooleanFlag(diskFlag);
    }

    const envFlag =
      process.env.KILL_SWITCH_INCIDENCIAS_ENABLED ??
      process.env.KILL_SWITCH_ENABLED ??
      'false';

    return this.parseBooleanFlag(envFlag);
  }

  public getMotivo(): string {
    if (this.hotMotivo) {
      return this.hotMotivo;
    }

    const diskMotivo =
      this.readEnvVariableFromDisk('KILL_SWITCH_MOTIVO') ??
      this.readEnvVariableFromDisk('KILL_SWITCH_REASON');

    return (
      diskMotivo ||
      process.env.KILL_SWITCH_MOTIVO ||
      process.env.KILL_SWITCH_REASON ||
      'El módulo de incidencias se encuentra temporalmente suspendido por mantenimiento crítico de emergencia.'
    );
  }

  /**
   * Permite conmutar el estado en caliente sin reiniciar el contenedor.
   * Pasar `null` devuelve el control al archivo .env / variables de entorno.
   */
  public setHotState(enabled: boolean | null, motivo?: string): void {
    this.hotOverride = enabled;
    if (motivo !== undefined) {
      this.hotMotivo = motivo;
    } else if (enabled === null) {
      this.hotMotivo = null;
    }
  }

  private parseBooleanFlag(value: string): boolean {
    const normalized = String(value).trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }

  private readEnvVariableFromDisk(key: string): string | null {
    try {
      const envPath = process.env.ENV_FILE_PATH || path.resolve(process.cwd(), '.env');
      if (!fs.existsSync(envPath)) {
        return null;
      }

      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split(/\r?\n/);

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;

        const eqIndex = line.indexOf('=');
        if (eqIndex === -1) continue;

        const currentKey = line.slice(0, eqIndex).trim();
        if (currentKey === key) {
          return line
            .slice(eqIndex + 1)
            .trim()
            .replace(/^["']|["']$/g, '');
        }
      }

      return null;
    } catch {
      return null;
    }
  }
}