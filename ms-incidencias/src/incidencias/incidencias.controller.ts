import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ActualizarEstadoDto } from './dto/actualizar-estado.dto';
import { CrearEvidenciaDto } from './dto/crear-evidencia.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportanteGuard } from '../auth/reportante.guard';
import { IncidenciasService } from './incidencias.service';

type RequestWithUser = Request & {
  user?: { userId?: string; sub?: string; role?: string };
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

  @Post('evidencias')
  @UseGuards(JwtAuthGuard, ReportanteGuard)
  async crearEvidencia(@Body() body: CrearEvidenciaDto) {
    return this.incidenciasService.crearEvidencia(body);
  }
}
