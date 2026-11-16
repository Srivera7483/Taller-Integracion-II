import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OrdenesTrabajoController } from './ordenes-trabajo.controller';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';
import { WebsocketsModule } from '../websockets/websockets.module';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 3000 }),
    WebsocketsModule,
    RabbitmqModule,
  ],
  controllers: [OrdenesTrabajoController],
  providers: [OrdenesTrabajoService],
  exports: [OrdenesTrabajoService],
})
export class OrdenesTrabajoModule {}
