import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RabbitmqProducerService } from './rabbitmq-producer.service';

@Module({
  imports: [ConfigModule],
  providers: [RabbitmqProducerService],
  exports: [RabbitmqProducerService],
})
export class RabbitmqModule {}