import {
  Body,
  Controller,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtUser } from '../auth/auth.types';
import { ActualizarEstadoDto } from './dto/actualizar-estado.dto';
import { ActualizarDiagnosticoDto } from './dto/actualizar-diagnostico.dto';
import { IncidenciasService } from './incidencias.service';

@Controller('incidencias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncidenciasController {
  constructor(private readonly incidenciasService: IncidenciasService) {}

  @Patch(':id_incidencia/estado')
  @UseGuards(JwtAuthGuard)
  async actualizarEstado(
    @Param('id_incidencia') incidenciaId: string,
    @Body() body: ActualizarEstadoDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.incidenciasService.actualizarEstado(
      incidenciaId,
      body.id_estado,
      user.userId,
    );
  }

  @Patch('ordenes-trabajo/:id_orden/diagnostico')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO', 'SUPERVISOR', 'ADMINISTRADOR')
  async actualizarDiagnostico(
    @Param('id_orden') id_orden: string,
    @Body() body: ActualizarDiagnosticoDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.incidenciasService.actualizarDiagnostico(
      id_orden,
      body.diagnostico_tecnico,
      user.userId,
    );
  }
}