import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from './mail/mail.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { RabbitmqModule } from './rabbitmq/rabbitmq.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MailModule,
    NotificacionesModule,
    RabbitmqModule,
  ],
})
export class AppModule {}
