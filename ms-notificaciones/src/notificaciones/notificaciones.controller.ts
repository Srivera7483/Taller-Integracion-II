
import { Body, Controller, Logger, Post } from '@nestjs/common';
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
  notificar(@Body() payload: CreateNotificacionDto) {
    return this.notificacionesService.encolar(payload);
  }

  @Post('eventos/notificaciones')
  async enviarNotificacion(@Body() payload: NotificacionEventoDto) {
    const ok = await this.rabbitmqPublisherService.publicarNotificacion(
      'notificacion.envio',
      payload,
    );
    return { status: ok ? 'publicado' : 'error' };
  }

  @Post('eventos/auditoria')
  async enviarAuditoria(@Body() payload: AuditoriaEventoDto) {
    const ok = await this.rabbitmqPublisherService.publicarAuditoria(
      'auditoria.registro',
      payload,
    );
    return { status: ok ? 'publicado' : 'error' };
  }

  @EventPattern('incidencia_critica')
  recibirIncidenciaCritica(
    @Payload() payload: any,
    @Ctx() context: unknown,
  ): void {
    this.logger.warn(
      `[RABBITMQ] Incidencia crítica recibida: ${JSON.stringify(payload)}`,
    );

    const rmqContext = context as RmqContext;
    const channel = rmqContext.getChannelRef();
    const message = rmqContext.getMessage();

    channel.ack(message);
  }
}
