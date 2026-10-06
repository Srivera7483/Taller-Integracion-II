import { Body, Controller, Post } from '@nestjs/common';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';
import { NotificacionesService } from './notificaciones.service';

@Controller()
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Post('notificar')
  notificar(@Body() payload: CreateNotificacionDto) {
    return this.notificacionesService.encolar(payload);
  }
}
