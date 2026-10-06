import { Body, Controller, Post } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';

@Controller()
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Post('notificar')
  notificar(@Body() payload: Record<string, unknown>) {
    return this.notificacionesService.encolar(payload);
  }
}
