import { Module } from '@nestjs/common';
import { NotificacionesModule } from './notificaciones/notificaciones.module';

@Module({
  imports: [NotificacionesModule],
})
export class AppModule {}
