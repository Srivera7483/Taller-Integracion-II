import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Guardián de Kill Switch para MS-Incidencias (TAL-4)
 *
 * Intercepta peticiones mutantes (POST, PUT, PATCH, DELETE) cuando la variable
 * KILL_SWITCH_INCIDENCIAS_ENABLED o KILL_SWITCH_ENABLED está activa,
 * respondiendo con HTTP 503 y la cabecera X-Kill-Switch: true.
 */
@Injectable()
export class KillSwitchGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const isKillSwitchActive =
      process.env.KILL_SWITCH_INCIDENCIAS_ENABLED === 'true' ||
      process.env.KILL_SWITCH_INCIDENCIAS_ENABLED === '1' ||
      process.env.KILL_SWITCH_ENABLED === 'true' ||
      process.env.KILL_SWITCH_ENABLED === '1';

    if (!isKillSwitchActive) {
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

      const motivo =
        process.env.KILL_SWITCH_MOTIVO ||
        process.env.KILL_SWITCH_REASON ||
        'El módulo de incidencias se encuentra temporalmente suspendido por mantenimiento crítico de emergencia.';

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
}

