import { Injectable } from '@nestjs/common';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';

@Injectable()
export class NotificacionesService {
  encolar(payload: CreateNotificacionDto) {
    console.log('Notificación encolada:', payload);
    return { status: 'encolada' };
  }
}
