import { Module } from '@nestjs/common';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { EventosModule } from './eventos/eventos.module';

@Module({
  imports: [NotificacionesModule, EventosModule],
})
export class AppModule {}
