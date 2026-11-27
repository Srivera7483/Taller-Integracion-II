import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { JwtService } from '@nestjs/jwt';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from './prisma.service';

const DEFAULT_SYSTEM_REPORTER_ID = '00000000-0000-4000-8000-000000000001';

@Injectable()
export class MantenimientosCron {
  private readonly logger = new Logger(MantenimientosCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    @Optional() private readonly jwtService?: JwtService,
  ) {}

  private obtenerEndpointIncidencias(): string {
    const rawBase = (process.env.MS_INCIDENCIAS_URL || 'http://localhost:3002').trim().replace(/\/+$/, '');
    if (rawBase.endsWith('/incidencias')) {
      return rawBase;
    }
    if (rawBase.endsWith('/api/v1')) {
      return `${rawBase}/incidencias`;
    }
    return `${rawBase}/api/v1/incidencias`;
  }

  private construirHeadersServicio(): Record<string, string> {
    if (!this.jwtService) {
      return {};
    }
    const token = this.jwtService.sign(
      {
        sub: process.env.CRON_SYSTEM_USER_ID || DEFAULT_SYSTEM_REPORTER_ID,
        email: 'cron-mantenimientos@uct.cl',
        rol: 'SUPERVISOR',
        permissions: ['incidencias:crear', 'incidencias:ver'],
      },
      { expiresIn: '5m' },
    );
    return { Authorization: `Bearer ${token}` };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async procesarMantenimientosPendientes() {
    this.logger.log('Iniciando escaneo automático de mantenimientos preventivos...');

    try {
      const fechaLimite = new Date();
      fechaLimite.setHours(fechaLimite.getHours() + 24);

      const mantenimientos = await this.prisma.mantenimiento.findMany({
        where: {
          fecha_programada: {
            lte: fechaLimite,
          },
        },
        take: 50,
      });

      if (mantenimientos.length === 0) {
        this.logger.log('No hay mantenimientos próximos a vencer. Escaneo finalizado.');
        return;
      }

      this.logger.log(`Se encontraron ${mantenimientos.length} mantenimientos para procesar.`);
      const endpoint = this.obtenerEndpointIncidencias();
      const headers = this.construirHeadersServicio();

      for (const mant of mantenimientos) {
        try {
          const payloadIncidencia = {
            id_activo: String(mant.id_activo),
            titulo: 'Mantenimiento Preventivo Programado',
            descripcion: `Generado automáticamente por el CronJob preventivo (Ref. Mantenimiento: ${mant.id_mantenimiento})`,
            prioridad: 'alta',
          };

          await firstValueFrom(
            this.httpService.post(endpoint, payloadIncidencia, { headers }),
          );

          this.logger.log(`[ALERTA AUTOMATIZADA] Incidencia creada exitosamente en ms-incidencias para el activo: ${mant.id_activo}`);

          await this.prisma.mantenimiento.delete({
            where: { id_mantenimiento: mant.id_mantenimiento },
          });
        } catch (itemError: any) {
          const detalle = itemError?.response?.data?.message || itemError?.response?.data?.mensaje || itemError?.message;
          this.logger.error(`Error al procesar el mantenimiento ${mant.id_mantenimiento} para el activo ${mant.id_activo}: ${detalle}`);
        }
      }

      this.logger.log('Escaneo de mantenimientos preventivos finalizado con éxito.');
    } catch (error: any) {
      this.logger.error('Fallo inesperado al ejecutar el CronJob de mantenimientos', error?.message || error);
    }
  }
}
