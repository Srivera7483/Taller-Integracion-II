
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NotificacionesModule,
    RabbitmqModule,
  ],
})
export class AppModule {}
