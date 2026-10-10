import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ActivosService } from './activos.service';
import { CrearMantenimientoDto } from './dto/crear-mantenimiento.dto';

@Controller('mantenimientos')
export class MantenimientosController {
  constructor(private readonly activosService: ActivosService) {}

  @Post('planificar')
  async planificar(@Body() dto: CrearMantenimientoDto) {
    return this.activosService.crearMantenimiento(dto);
  }
}