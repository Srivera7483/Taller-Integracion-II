
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificacionesModule } from './notificaciones/notificaciones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NotificacionesModule,
  ],
})
export class AppModule {}
