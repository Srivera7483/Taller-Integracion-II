import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtUser } from '../auth/auth.types';
import { AsignarOrdenDto } from './dto/asignar-orden.dto';
import { FiltrarOrdenesDto } from './dto/filtrar-ordenes.dto';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';

@Controller('ordenes-trabajo')
export class OrdenesTrabajoController {
  constructor(private readonly ordenesService: OrdenesTrabajoService) {}

  @Post('asignar')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR', 'ADMINISTRADOR')
  async asignarOrden(
    @Body() body: AsignarOrdenDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.ordenesService.asignarOrden(body, user.userId);
  }

  @Get('mis-ordenes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO', 'SUPERVISOR', 'ADMINISTRADOR')
  async listarMisOrdenes(
    @CurrentUser() user: JwtUser,
    @Query() filtros: FiltrarOrdenesDto,
  ) {
    return this.ordenesService.listarPorTecnico(user.userId, filtros);
  }

  @Get('tecnico/:idTecnico')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TECNICO', 'SUPERVISOR', 'ADMINISTRADOR')
  async listarPorTecnico(
    @Param('idTecnico') idTecnico: string,
    @CurrentUser() user: JwtUser,
    @Query() filtros: FiltrarOrdenesDto,
  ) {
    const userRole = user.role.toUpperCase();

    // IDOR Protection: Un técnico solo puede consultar sus propias órdenes
    if (userRole === 'TECNICO' && user.userId !== idTecnico) {
      throw new ForbiddenException(
        'Acceso denegado: un técnico solo puede consultar sus propias órdenes de trabajo',
      );
    }

    return this.ordenesService.listarPorTecnico(idTecnico, filtros);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async obtenerPorId(@Param('id') id: string) {
    return this.ordenesService.obtenerPorId(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR', 'ADMINISTRADOR')
  async listarTodas(@Query() filtros: FiltrarOrdenesDto) {
    return this.ordenesService.listarTodas(filtros);
  }
}
