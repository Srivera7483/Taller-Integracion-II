import { Module } from '@nestjs/common';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';
import { CatalogosController } from './catalogos.controller';

@Module({
  controllers: [IncidenciasController, CatalogosController],
  providers: [IncidenciasService],
})
export class IncidenciasModule {}
