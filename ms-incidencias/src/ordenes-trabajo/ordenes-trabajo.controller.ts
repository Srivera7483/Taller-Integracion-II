import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AsignarOrdenDto } from './dto/asignar-orden.dto';
import { FiltrarOrdenesDto } from './dto/filtrar-ordenes.dto';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';

type RequestWithUser = Request & {
  user?: { userId?: string; sub?: string; role?: string };
};

@Controller('ordenes-trabajo')
export class OrdenesTrabajoController {
  constructor(private readonly ordenesService: OrdenesTrabajoService) {}

  @Post('asignar')
  @HttpCode(HttpStatus.CREATED)
  async asignarOrden(
    @Body() body: AsignarOrdenDto,
    @Req() request: RequestWithUser,
  ) {
    const usuarioId = request.user?.userId ?? request.user?.sub;

    if (!usuarioId) {
      throw new UnauthorizedException('Usuario autenticado requerido');
    }

    return this.ordenesService.asignarOrden(body, usuarioId);
  }

  @Get('tecnico/:idTecnico')
  async listarPorTecnico(
    @Param('idTecnico') idTecnico: string,
    @Query() filtros: FiltrarOrdenesDto,
  ) {
    return this.ordenesService.listarPorTecnico(idTecnico, filtros);
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return this.ordenesService.obtenerPorId(id);
  }

  @Get()
  async listarTodas(@Query() filtros: FiltrarOrdenesDto) {
    return this.ordenesService.listarTodas(filtros);
  }
}
