import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AsignarOrdenDto } from './dto/asignar-orden.dto';
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
    const supervisorId = request.user?.userId ?? request.user?.sub;

    if (!supervisorId) {
      throw new UnauthorizedException('Usuario supervisor autenticado requerido');
    }

    return this.ordenesService.asignarOrden(body, supervisorId);
  }

  @Get()
  async listarTodas() {
    return this.ordenesService.listarTodas();
  }

  @Get('tecnico/:tecnicoId')
  async listarPorTecnico(@Param('tecnicoId') tecnicoId: string) {
    return this.ordenesService.listarPorTecnico(tecnicoId);
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return this.ordenesService.obtenerPorId(id);
  }
}
