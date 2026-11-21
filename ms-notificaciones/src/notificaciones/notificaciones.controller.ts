import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Optional,
  Post,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { RabbitmqConsumerService } from '../rabbitmq/rabbitmq-consumer.service';

@Controller()
export class NotificacionesController {
  private readonly logger = new Logger(NotificacionesController.name);
  private readonly maxRetries: number;

  constructor(
    private readonly notificacionesService: NotificacionesService,
    private readonly rabbitmqPublisherService: RabbitmqPublisherService,
    private readonly configService?: ConfigService,
    @Optional()
    @Inject(forwardRef(() => RabbitmqConsumerService))
    private readonly rabbitmqConsumerService?: RabbitmqConsumerService,
  ) {
    this.maxRetries = Number(
      this.configService?.get<string>('RABBITMQ_MAX_RETRIES') ?? '3',
    );
  }

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

    const headers = message?.properties?.headers || {};
    const retryCount = Number(headers['x-retry-count'] || 0);

    try {
      const resultado =
        await this.notificacionesService.procesarIncidenciaCritica(payload);

      if (resultado.status === 'fallida') {
        throw {
          message:
            resultado.error ??
            'Fallo procesando notificación de incidencia crítica',
          transient: resultado.transient ?? false,
        };
      }

      // Confirmar (ack) ÚNICAMENTE cuando el procesamiento y trazabilidad fueron exitosos
      if (channel && message) {
        channel.ack(message);
      }
    } catch (error: any) {
      const isTransient =
        typeof error === 'object' && error !== null && error.transient === true;
      const errorMsg =
        error instanceof Error
          ? error.message
          : error?.message || String(error);

      this.logger.error(
        `[RABBITMQ] Error procesando incidencia crítica recibida: ${errorMsg}. Reintento: ${retryCount}/${this.maxRetries}`,
      );

      await this.manejarFalloReintento(
        channel,
        message,
        retryCount,
        isTransient,
        'incidencias_criticas',
      );
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

    const headers = message?.properties?.headers || {};
    const retryCount = Number(headers['x-retry-count'] || 0);

    try {
      let resultado;

      if (payload.id_orden && payload.id_tecnico) {
        resultado =
          await this.notificacionesService.procesarOrdenAsignada(payload);
      } else if (this.esEstadoResolucion(payload)) {
        resultado =
          await this.notificacionesService.procesarIncidenciaResuelta(payload);
      } else {
        // Estado intermedio (ej: 'EN_PROCESO', 'REPORTADA'): no corresponde a resolución ni asignación
        this.logger.log(
          `[RABBITMQ] Evento de actualización ignorado para notificación de resolución (estado no resolutivo: '${payload.nuevo_estado ??
          payload.nombre_estado ??
          payload.estado
          }')`,
        );
        if (channel && message) {
          channel.ack(message);
        }
        return;
      }

      if (resultado && resultado.status === 'fallida') {
        throw {
          message:
            resultado.error ?? 'Fallo procesando actualización de incidencia',
          transient: resultado.transient ?? false,
        };
      }

      // Confirmar (ack) ÚNICAMENTE tras procesamiento exitoso
      if (channel && message) {
        channel.ack(message);
      }
    } catch (error: any) {
      const isTransient =
        typeof error === 'object' && error !== null && error.transient === true;
      const errorMsg =
        error instanceof Error
          ? error.message
          : error?.message || String(error);

      this.logger.error(
        `[RABBITMQ] Error procesando actualización de incidencia: ${errorMsg}. Reintento: ${retryCount}/${this.maxRetries}`,
      );

      await this.manejarFalloReintento(
        channel,
        message,
        retryCount,
        isTransient,
        'incidencia_actualizada',
      );
    }
  }

  private async manejarFalloReintento(
    channel: any,
    message: any,
    retryCount: number,
    isTransient: boolean,
    defaultRoutingKey: string,
  ): Promise<void> {
    if (!channel || !message) {
      return;
    }

    // Ante error permanente (transient === false) o cuando retryCount >= maxRetries:
    // Derivar directamente a la DLQ (requeue = false)
    if (!isTransient || retryCount >= this.maxRetries) {
      this.logger.error(
        `[RABBITMQ] ${!isTransient
          ? 'Error permanente detectado (no transitorio)'
          : `Máximo de reintentos alcanzado (${retryCount}/${this.maxRetries})`
        }. Derivando mensaje a DLQ (nack sin requeue).`,
      );
      channel.nack(message, false, false);
      return;
    }

    // Ante fallo transitorio con retryCount < maxRetries:
    const nuevoRetryCount = retryCount + 1;
    const exchange = message.fields?.exchange ?? '';
    const routingKey = message.fields?.routingKey ?? defaultRoutingKey;
    const content = message.content ?? Buffer.from(JSON.stringify(message));
    const properties = message.properties ?? {};

    let confirmado = false;
    if (this.rabbitmqConsumerService) {
      confirmado = await this.rabbitmqConsumerService.republicarConConfirmacion(
        exchange,
        routingKey,
        content,
        properties,
        nuevoRetryCount,
      );
    } else if (typeof channel.publish === 'function') {
      try {
        confirmado = Boolean(
          channel.publish(
            exchange,
            routingKey,
            content,
            {
              ...properties,
              headers: {
                ...(properties.headers || {}),
                'x-retry-count': nuevoRetryCount,
              },
            },
          ),
        );
      } catch {
        confirmado = false;
      }
    }

    if (confirmado) {
      this.logger.log(
        `[RABBITMQ] Reintento #${nuevoRetryCount} confirmado por el broker. Ejecutando ack del mensaje original.`,
      );
      channel.ack(message);
    } else {
      this.logger.error(
        `[RABBITMQ] Falló la confirmación de la republicación por parte del broker. Derivando a DLQ sin ack para evitar bucle infinito y pérdida.`,
      );
      channel.nack(message, false, false);
    }
  }

  private esEstadoResolucion(payload: any): boolean {
    const estadoObj =
      typeof payload.estado === 'object' && payload.estado !== null
        ? payload.estado.nombre_estado
        : payload.estado;

    const estadoRaw = String(
      payload.nuevo_estado ?? payload.nombre_estado ?? estadoObj ?? '',
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

