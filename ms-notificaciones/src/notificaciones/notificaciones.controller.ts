
import { Body, Controller, Logger, Post } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';
import { NotificacionesService } from './notificaciones.service';

@Controller()
export class NotificacionesController {
  private readonly logger = new Logger(NotificacionesController.name);

  constructor(
    private readonly notificacionesService: NotificacionesService,
  ) {}

  @Post('notificar')
  notificar(@Body() payload: CreateNotificacionDto) {
    return this.notificacionesService.encolar(payload);
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
