import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ActivosService } from './activos.service';
import { CrearMantenimientoDto } from './dto/crear-mantenimiento.dto';

@Controller('mantenimientos')
export class MantenimientosController {
  constructor(private readonly activosService: ActivosService) {}

  @Get()
  async listar(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('id_activo') idActivo?: string,
  ) {
    return this.activosService.listarMantenimientos({
      startDate,
      endDate,
      id_activo: idActivo,
    });
  }

  @Post('planificar')
  async planificar(@Body() dto: CrearMantenimientoDto) {
    return this.activosService.crearMantenimiento(dto);
  }
}