import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';
import { CatalogosController } from './catalogos.controller';
import { PrioridadDinamicaService } from './prioridad-dinamica.service';
import { ExportarIncidenciasService } from './exportar-incidencias.service';
import { CloudinaryService } from './cloudinary.service';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [HttpModule.register({ timeout: 3000 }), RabbitmqModule],
  controllers: [IncidenciasController, CatalogosController],
  providers: [
    IncidenciasService,
    PrioridadDinamicaService,
    ExportarIncidenciasService,
    CloudinaryService,
  ],
  exports: [
    IncidenciasService,
    PrioridadDinamicaService,
    ExportarIncidenciasService,
    CloudinaryService,
  ],
})
export class IncidenciasModule {}