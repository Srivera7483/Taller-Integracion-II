import { Module, forwardRef } from '@nestjs/common';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [forwardRef(() => RabbitmqModule)],
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
