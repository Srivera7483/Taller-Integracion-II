import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitmqTopologyService } from './rabbitmq-topology.service';
import { RabbitmqConsumerService } from './rabbitmq-consumer.service';
import { RabbitmqPublisherService } from './rabbitmq-publisher.service';

@Module({
  imports: [ConfigModule],
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
