import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitmqTopologyService } from './rabbitmq-topology.service';
import { RabbitmqConsumerService } from './rabbitmq-consumer.service';
import { RabbitmqPublisherService } from './rabbitmq-publisher.service';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [ConfigModule, forwardRef(() => NotificacionesModule)],
  providers: [
    RabbitmqTopologyService,
    RabbitmqConsumerService,
    RabbitmqPublisherService,
  ],
  exports: [
    RabbitmqTopologyService,
    RabbitmqConsumerService,
    RabbitmqPublisherService,
  ],
})
export class RabbitmqModule {}
