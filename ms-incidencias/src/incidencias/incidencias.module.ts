import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';
import { CatalogosController } from './catalogos.controller';

@Module({
  imports: [HttpModule.register({ timeout: 3000 })],
  controllers: [IncidenciasController, CatalogosController],
  providers: [IncidenciasService],
})
export class IncidenciasModule {}
