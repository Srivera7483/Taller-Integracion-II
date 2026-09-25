import {
  Body,
  Controller,
  Param,
  Patch,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ActualizarEstadoDto } from './dto/actualizar-estado.dto';
import { IncidenciasService } from './incidencias.service';

type RequestWithUser = Request & {
  user?: { userId?: string; sub?: string };
};

@Controller('incidencias')
export class IncidenciasController {
  constructor(private readonly incidenciasService: IncidenciasService) {}

  @Patch(':id/estado')
  async actualizarEstado(
    @Param('id') incidenciaId: string,
    @Body() body: ActualizarEstadoDto,
    @Req() request: RequestWithUser,
  ) {
    const usuarioId = request.user?.userId ?? request.user?.sub;

    if (!usuarioId) {
      throw new UnauthorizedException('Usuario autenticado requerido');
    }

    return this.incidenciasService.actualizarEstado(
      incidenciaId,
      body.estado,
      usuarioId,
    );
  }
}
