import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtUser } from '../auth/auth.types';

import { AsignarOrdenDto } from './dto/asignar-orden.dto';
import { FiltrarOrdenesDto } from './dto/filtrar-ordenes.dto';
import { ActualizarDiagnosticoDto } from '../incidencias/dto/actualizar-diagnostico.dto';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';

@Controller('ordenes-trabajo')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdenesTrabajoController {
  constructor(private readonly ordenesService: OrdenesTrabajoService) {}

  @Post('asignar')
  @HttpCode(HttpStatus.CREATED)

  @Roles('SUPERVISOR', 'ADMINISTRADOR')
  async asignarOrden(
    @Body() body: AsignarOrdenDto,
    @CurrentUser() user: JwtUser,
  ) {
    const idUsuario = user.sub || user.userId;
    if (!idUsuario) throw new UnauthorizedException('Usuario autenticado inválido');
    return this.ordenesService.asignarOrden(body, idUsuario);
  }

  @Get('mis-ordenes')
  @Roles('TECNICO', 'SUPERVISOR', 'ADMINISTRADOR')
  async listarMisOrdenes(
    @CurrentUser() user: JwtUser,
    @Query() filtros: FiltrarOrdenesDto,
  ) {
    const idUsuario = user.sub || user.userId;
    if (!idUsuario) throw new UnauthorizedException('Usuario autenticado inválido');
    return this.ordenesService.listarPorTecnico(idUsuario, filtros);
  }

  @Get('tecnico/:idTecnico')
  @Roles('TECNICO', 'SUPERVISOR', 'ADMINISTRADOR')
  async listarPorTecnico(
    @Param('idTecnico', ParseUUIDPipe) idTecnico: string,
    @CurrentUser() user: JwtUser,
    @Query() filtros: FiltrarOrdenesDto,
  ) {
    const rolUsuario = user.rol || user.role;
    const idUsuario = user.sub || user.userId;
    if (!idUsuario) throw new UnauthorizedException('Usuario autenticado inválido');

    if (rolUsuario?.toUpperCase() === 'TECNICO' && idUsuario !== idTecnico) {
      throw new ForbiddenException(
        'Acceso denegado: un técnico solo puede consultar sus propias órdenes de trabajo',
      );
    }

    return this.ordenesService.listarPorTecnico(idTecnico, filtros);
  }

  @Get()
  @Roles('SUPERVISOR', 'ADMINISTRADOR')
  async listarTodas(@Query() filtros: FiltrarOrdenesDto) {
    return this.ordenesService.listarTodas(filtros);
  }

  @Get(':id_orden')
  async obtenerPorId(@Param('id_orden', ParseUUIDPipe) id_orden: string) {
    return this.ordenesService.obtenerPorId(id_orden);
  }

  @Patch(':id_orden/diagnostico')
  @Roles('TECNICO', 'SUPERVISOR', 'ADMINISTRADOR')
  async actualizarDiagnostico(
    @Param('id_orden', ParseUUIDPipe) id_orden: string,
    @Body() body: ActualizarDiagnosticoDto,
    @CurrentUser() user: JwtUser,
  ) {
    const idUsuario = user.sub || user.userId;
    if (!idUsuario) throw new UnauthorizedException('Usuario autenticado inválido');
    return this.ordenesService.actualizarDiagnostico(
      id_orden,
      body.diagnostico_tecnico,
      idUsuario,
    );
  }
}
