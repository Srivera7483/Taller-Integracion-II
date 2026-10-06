import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificacionesService {
  encolar(payload: Record<string, unknown>) {
    console.log('Notificación encolada:', payload);
    return { status: 'encolada' };
  }
}
