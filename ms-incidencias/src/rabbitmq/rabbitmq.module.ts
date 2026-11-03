import { Module } from '@nestjs/common';
import { RabbitmqProducerService } from './rabbitmq-producer.service';

@Module({
  providers: [RabbitmqProducerService],
  exports: [RabbitmqProducerService],
})
export class RabbitmqModule {}

