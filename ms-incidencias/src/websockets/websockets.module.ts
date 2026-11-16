import { Module } from '@nestjs/common';
import { IncidenciasGateway } from './incidencias.gateway';

@Module({
  providers: [IncidenciasGateway],
  exports: [IncidenciasGateway],
})
export class WebsocketsModule {}
