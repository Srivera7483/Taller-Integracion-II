import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from './prisma.service';

@Injectable()
export class MantenimientosCron {
  private readonly logger = new Logger(MantenimientosCron.name);

  // URL del microservicio de incidencias desde las variables de entorno
  private readonly msIncidenciasUrl = process.env.MS_INCIDENCIAS_URL || '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {}

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
      });

      if (mantenimientos.length === 0) {
        this.logger.log('No hay mantenimientos próximos a vencer. Escaneo finalizado.');
        return;
      }

      this.logger.log(`Se encontraron ${mantenimientos.length} mantenimientos para procesar.`);

      for (const mant of mantenimientos) {
        try {
          // Preparamos el cuerpo de la petición (Payload) que espera ms-incidencias
          const payloadIncidencia = {
            id_activo: mant.id_activo,
            titulo: 'Mantenimiento Preventivo Programado',
            descripcion: `Generado automáticamente por el CronJob (Ref. Mantenimiento: ${mant.id_mantenimiento})`,
            estado: 'REPORTADA',
          };

          // Invocamos por HTTP POST a ms-incidencias usando firstValueFrom
          await firstValueFrom(
            this.httpService.post(this.msIncidenciasUrl, payloadIncidencia)
          );

          this.logger.log(`[ALERTA AUTOMATIZADA] Incidencia creada exitosamente en ms-incidencias para el activo: ${mant.id_activo}`);

          // Si el otro microservicio respondió OK, eliminamos el registro local
          await this.prisma.mantenimiento.delete({
            where: { id_mantenimiento: mant.id_mantenimiento },
          });

        } catch (itemError: any) { // Tipado como 'any' para evitar errores de compilación en .response y .message
          const detalle = itemError.response?.data?.message || itemError.message;
          this.logger.error(`Error al procesar el mantenimiento ${mant.id_mantenimiento} para el activo ${mant.id_activo}: ${detalle}`);
        }
      }

      this.logger.log('Escaneo de mantenimientos preventivos finalizado con éxito.');
    } catch (error: any) {
      this.logger.error('Fallo inesperado al ejecutar el CronJob de mantenimientos', error?.message || error);
    }
  }
}