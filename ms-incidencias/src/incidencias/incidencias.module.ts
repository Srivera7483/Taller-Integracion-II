import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';
import { CatalogosController } from './catalogos.controller';
import { PrioridadDinamicaService } from './prioridad-dinamica.service';

@Module({
  imports: [HttpModule.register({ timeout: 3000 })],
  controllers: [IncidenciasController, CatalogosController],
  providers: [IncidenciasService, PrioridadDinamicaService],
  exports: [IncidenciasService, PrioridadDinamicaService],
})
export class IncidenciasModule {}
