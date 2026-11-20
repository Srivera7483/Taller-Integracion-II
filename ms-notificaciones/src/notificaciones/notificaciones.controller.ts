import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionEventoDto } from '../rabbitmq/dto/notificacion-evento.dto';
import { AuditoriaEventoDto } from '../rabbitmq/dto/auditoria-evento.dto';
import { RabbitmqPublisherService } from '../rabbitmq/rabbitmq-publisher.service';

@Controller()
export class NotificacionesController {
  private readonly logger = new Logger(NotificacionesController.name);

  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly rabbitmqPublisherService: RabbitmqPublisherService,
  ) {}

  @Post('notificar')
  @HttpCode(HttpStatus.OK)
  async notificar(@Body() payload: CreateNotificacionDto) {
    return await this.notificacionesService.notificar(payload);
  }

  @Post('eventos/notificaciones')
  @HttpCode(HttpStatus.OK)
  async enviarNotificacion(@Body() payload: NotificacionEventoDto) {
    const ok = await this.rabbitmqPublisherService.publicarNotificacion(
      'notificacion.envio',
      payload,
    );
    return { status: ok ? 'publicado' : 'error' };
  }

  @Post('eventos/auditoria')
  @HttpCode(HttpStatus.OK)
  async enviarAuditoria(@Body() payload: AuditoriaEventoDto) {
    const ok = await this.rabbitmqPublisherService.publicarAuditoria(
      'auditoria.registro',
      payload,
    );
    return { status: ok ? 'publicado' : 'error' };
  }

  @Post('notificaciones/incidencias/critica')
  @HttpCode(HttpStatus.OK)
  async dispararIncidenciaCritica(@Body() payload: any) {
    return await this.notificacionesService.procesarIncidenciaCritica(payload);
  }

  @Post('notificaciones/ordenes/asignada')
  @HttpCode(HttpStatus.OK)
  async dispararOrdenAsignada(@Body() payload: any) {
    return await this.notificacionesService.procesarOrdenAsignada(payload);
  }

  @Post('notificaciones/incidencias/resuelta')
  @HttpCode(HttpStatus.OK)
  async dispararIncidenciaResuelta(@Body() payload: any) {
    return await this.notificacionesService.procesarIncidenciaResuelta(payload);
  }

  @Post('notificaciones/activos/mantenimiento-preventivo')
  @HttpCode(HttpStatus.OK)
  async dispararMantenimientoPreventivo(@Body() payload: any) {
    return await this.notificacionesService.procesarMantenimientoPreventivo(
      payload,
    );
  }

  @EventPattern('incidencia_critica')
  async recibirIncidenciaCritica(
    @Payload() payload: any,
    @Ctx() context: unknown,
  ): Promise<void> {
    this.logger.warn(
      `[RABBITMQ] Incidencia crítica recibida: ${JSON.stringify(payload)}`,
    );

    const rmqContext = context as RmqContext;
    const channel = rmqContext?.getChannelRef?.();
    const message = rmqContext?.getMessage?.();

    try {
      const resultado =
        await this.notificacionesService.procesarIncidenciaCritica(payload);

      if (resultado.status === 'fallida') {
        throw new Error(
          resultado.error ?? 'Fallo procesando notificación de incidencia crítica',
        );
      }

      // Confirmar (ack) ÚNICAMENTE cuando el procesamiento y trazabilidad fueron exitosos
      if (channel && message) {
        channel.ack(message);
      }
    } catch (error) {
      this.logger.error(
        `[RABBITMQ] Error procesando incidencia crítica recibida: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      // En caso de fallo, NO hacer ack: hacer nack con requeue=false para derivar al DLX
      if (channel && message) {
        channel.nack(message, false, false);
      }
    }
  }

  @EventPattern('incidencia_actualizada')
  async recibirIncidenciaActualizada(
    @Payload() payload: any,
    @Ctx() context: unknown,
  ): Promise<void> {
    this.logger.log(
      `[RABBITMQ] Incidencia actualizada recibida: ${JSON.stringify(payload)}`,
    );

    const rmqContext = context as RmqContext;
    const channel = rmqContext?.getChannelRef?.();
    const message = rmqContext?.getMessage?.();

    try {
      let resultado;

      if (payload.id_orden && payload.id_tecnico) {
        resultado = await this.notificacionesService.procesarOrdenAsignada(payload);
      } else if (this.esEstadoResolucion(payload)) {
        resultado = await this.notificacionesService.procesarIncidenciaResuelta(payload);
      } else {
        // Estado intermedio (ej: 'EN_PROCESO', 'REPORTADA'): no corresponde a resolución
        this.logger.log(
          `[RABBITMQ] Evento de actualización ignorado para notificación de resolución (estado no resolutivo: '${
            payload.nuevo_estado ?? payload.nombre_estado ?? payload.estado
          }')`,
        );
        if (channel && message) {
          channel.ack(message);
        }
        return;
      }

      if (resultado && resultado.status === 'fallida') {
        throw new Error(
          resultado.error ?? 'Fallo procesando actualización de incidencia',
        );
      }

      // Confirmar (ack) ÚNICAMENTE tras procesamiento exitoso
      if (channel && message) {
        channel.ack(message);
      }
    } catch (error) {
      this.logger.error(
        `[RABBITMQ] Error procesando actualización de incidencia: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (channel && message) {
        channel.nack(message, false, false);
      }
    }
  }

  private esEstadoResolucion(payload: any): boolean {
    const estadoRaw = String(
      payload.nuevo_estado ??
        payload.nombre_estado ??
        payload.estado ??
        '',
    )
      .trim()
      .toUpperCase();

    const estadosResolucion = [
      'RESUELTA',
      'RESUELTO',
      'CERRADA',
      'CERRADO',
      'FINALIZADA',
      'FINALIZADO',
    ];

    return estadosResolucion.includes(estadoRaw);
  }
}
