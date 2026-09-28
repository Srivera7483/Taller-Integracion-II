import { Controller, Get } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';

@Controller()
export class CatalogosController {
  constructor(private readonly incidenciasService: IncidenciasService) {}

  @Get('estados-incidencia')
  listarEstados() {
    return this.incidenciasService.listarEstados();
  }

  @Get('tipos-evidencia')
  listarTiposEvidencia() {
    return this.incidenciasService.listarTiposEvidencia();
  }
}