import { Module } from '@nestjs/common';
import { EventosCriticosConsumer } from './eventos-criticos.consumer';

@Module({
  controllers: [EventosCriticosConsumer],
  providers: [EventosCriticosConsumer],
  exports: [EventosCriticosConsumer],
})
export class EventosModule {}

