import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ActivosService } from './activos.service';
import { CrearMantenimientoDto } from './dto/crear-mantenimiento.dto';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';

@Controller('mantenimientos')
@UseGuards(PermissionsGuard)
export class MantenimientosController {
  constructor(private readonly activosService: ActivosService) {}

  @Get()
  @RequirePermissions('mantenimientos:crear')
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
  @RequirePermissions('mantenimientos:crear')
  async planificar(@Body() dto: CrearMantenimientoDto) {
    return this.activosService.crearMantenimiento(dto);
  }
}
