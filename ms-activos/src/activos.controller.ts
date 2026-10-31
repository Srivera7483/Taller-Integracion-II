import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ActivosService } from './activos.service';
import {
  RespuestaValidacionQR,
  RespuestaRedireccionIncidencia,
  RespuestaEstadisticas,
  FiltroEstadisticasDto,
  Activo,
} from './interfaces/activo.interface';
import { RespuestaTrazabilidadActivo } from './interfaces/trazabilidad.interface';
import { TrazabilidadQueryDto } from './dto/trazabilidad-query.dto';

@Controller('activos')
export class ActivosController {
  constructor(private readonly activosService: ActivosService) {}

  @Get('validar-qr')
  async validarCodigoQr(@Query('codigoQr') codigoQr: string): Promise<RespuestaValidacionQR> {
    const resultado = await this.activosService.validarCodigoQR(codigoQr);
    if (!resultado.valido) {
      const esNoEncontrado = resultado.mensaje.includes('No se encontró');
      if (esNoEncontrado) {
        throw new NotFoundException(resultado);
      }
      throw new BadRequestException(resultado);
    }
    return resultado;
  }

  @Get('redireccion-incidencia')
  async obtenerRedireccionIncidencia(@Query('codigoQr') codigoQr: string): Promise<RespuestaRedireccionIncidencia> {
    const resultado = await this.activosService.generarEnlaceIncidencia(codigoQr);
    if (!resultado.valido) {
      const esNoEncontrado = resultado.mensaje.includes('No se encontró');
      if (esNoEncontrado) {
        throw new NotFoundException(resultado);
      }
      throw new BadRequestException(resultado);
    }
    return resultado;
  }

  @Get('estadisticas')
  async obtenerEstadisticas(@Query() filtros?: FiltroEstadisticasDto): Promise<RespuestaEstadisticas> {
    return this.activosService.obtenerEstadisticas(filtros);
  }

  @Get(':id/trazabilidad')
  async obtenerTrazabilidad(
    @Param('id') id: string,
    @Query() query?: TrazabilidadQueryDto,
  ): Promise<RespuestaTrazabilidadActivo> {
    return this.activosService.obtenerTrazabilidad(id, query);
  }

  @Get()
  async listarActivos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    valido: boolean;
    total: number;
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    datos: Activo[];
  }> {
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(limit || '20', 10) || 20));
    const activos = await this.activosService.listarTodos({ page: pageNum, limit: limitNum });
    const total = await this.activosService.contarTotalActivos();
    return {
      valido: true,
      total,
      totalItems: total,
      totalPages: Math.ceil(total / limitNum) || 1,
      currentPage: pageNum,
      limit: limitNum,
      datos: activos,
    };
  }
}
