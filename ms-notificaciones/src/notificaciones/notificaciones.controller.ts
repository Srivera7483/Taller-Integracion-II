
import { Body, Controller, Logger, Post } from '@nestjs/common';
import { NotificacionEventoDto } from '../rabbitmq/dto/notificacion-evento.dto';
import { AuditoriaEventoDto } from '../rabbitmq/dto/auditoria-evento.dto';
import { RabbitmqPublisherService } from '../rabbitmq/rabbitmq-publisher.service';

@Controller()
export class NotificacionesController {
  private readonly logger = new Logger(NotificacionesController.name);

  constructor(
    private readonly rabbitmqPublisherService: RabbitmqPublisherService,
  ) {}

  @Post('notificar')
  notificar(@Body() payload: NotificacionEventoDto) {
    this.logger.warn(`Notificación HTTP recibida: ${JSON.stringify(payload)}`);
    return { status: 'encolada' };
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
}
