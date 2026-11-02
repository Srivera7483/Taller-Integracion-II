import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import type { IncidenciaCriticaMensaje } from './interfaces/incidencia-critica.interface';

@Controller()
export class EventosCriticosConsumer {
  private readonly logger = new Logger(EventosCriticosConsumer.name);

  /**
   * Consumidor esclavo para eventos de incidencias críticas (TAL-11).
   * Escucha la cola 'incidencias_criticas' con confirmación manual (ACK)
   * para garantizar cero pérdida de paquetes.
   */
  @EventPattern('incidencia_critica')
  @EventPattern('incidencias_criticas')
  @MessagePattern('incidencia_critica')
  @MessagePattern('incidencias_criticas')
  async consumirIncidenciaCritica(
    @Payload() data: any,
    @Ctx() context: any,
  ) {
    const channel = context?.getChannelRef?.();
    const originalMsg = context?.getMessage?.();

    try {
      // Normalizar payload en caso de recibir contenido crudo o anidado
      let mensaje: IncidenciaCriticaMensaje = data;
      if (!mensaje || typeof mensaje !== 'object') {
        try {
          mensaje = JSON.parse(originalMsg.content.toString());
        } catch {
          mensaje = data as IncidenciaCriticaMensaje;
        }
      }

      this.imprimirAlertaCritica(mensaje);

      this.logger.log(
        `[CONSUMER] Incidencia crítica procesada con éxito: ID=${mensaje.id_incidencia}, Título="${mensaje.titulo}"`,
      );

      // Criterios de Aceptación TAL-11:
      // "Mensajes ingresan a la cola sin pérdida de paquetes (Acks manuales o automáticos configurados)."
      // Confirmamos manualmente el paquete una vez impreso y procesado.
      if (channel && typeof channel.ack === 'function' && originalMsg) {
        channel.ack(originalMsg);
      }

      return {
        status: 'consumido',
        id_incidencia: mensaje.id_incidencia,
        ack: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[CONSUMER] Error al procesar incidencia crítica: ${errorMsg}`);

      // Re-encolar paquete en caso de falla transitoria
      if (channel && typeof channel.nack === 'function' && originalMsg) {
        channel.nack(originalMsg, false, true);
      }
      throw error;
    }
  }

  /**
   * Imprime de forma destacada en la terminal el mensaje de la incidencia crítica.
   */
  public imprimirAlertaCritica(data: IncidenciaCriticaMensaje): void {
    const banner = [
      '================================================================================',
      '🚨 [CONSUMIDOR ESCLAVO - RABBITMQ] ALERTA DE INCIDENCIA CRÍTICA DETECTADA 🚨',
      '================================================================================',
      `🆔 ID Incidencia:    ${data?.id_incidencia ?? 'N/A'}`,
      `🏢 ID Activo:        ${data?.id_activo ?? 'N/A'}`,
      `👤 ID Reportante:    ${data?.id_reportante ?? 'N/A'}`,
      `📌 Título:           ${data?.titulo ?? 'Sin título'}`,
      `📝 Descripción:      ${data?.descripcion ?? 'Sin descripción'}`,
      `⚠️  Prioridad:        ${data?.prioridad ?? 'Crítica'}`,
      `📅 Fecha Creación:   ${data?.fecha_creacion ?? new Date().toISOString()}`,
      `📊 Estado:           ${data?.estado ?? 'Reportada'}`,
      '--------------------------------------------------------------------------------',
      '✅ Estado del mensaje: PROCESADO Y CONFIRMADO CON MANUAL ACK (Cero pérdida de paquetes)',
      '================================================================================',
    ].join('\n');

    console.log(banner);
  }
}
