import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';

@Injectable()
export class MantenimientosCron {
  // usa logger de winston 
  private readonly logger = new Logger(MantenimientosCron.name);

  constructor(private readonly prisma: PrismaService) {}

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
        // NOTA ARQUITECTÓNICA: Como el contrato indica que las Incidencias viven en otro microservicio,
        // aquí es donde se emitiría un evento (ej. RabbitMQ/Kafka) o se haría una petición HTTP al ms-incidencias
        // para que cree la Orden de Trabajo.
        
        this.logger.log(`[ALERTA AUTOMATIZADA] Revisión preventiva requerida para el activo: ${mant.id_activo} (Ref. Mantenimiento: ${mant.id_mantenimiento})`);

        // Una vez que el ms-incidencias confirme la recepción, lo ideal sería eliminar este registro
        // para que no vuelva a dispararse mañana. Entonces, pendiente:
        // await this.prisma.mantenimiento.delete({ where: { id_mantenimiento: mant.id_mantenimiento } });
      }

      this.logger.log('Escaneo de mantenimientos preventivos finalizado con éxito.');
    } catch (error) {
      this.logger.error('Fallo inesperado al ejecutar el CronJob de mantenimientos', error);
    }
  }
}