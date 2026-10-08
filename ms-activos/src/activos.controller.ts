import { Controller, Get, Post, Body, Query, NotFoundException, BadRequestException, UseGuards } from '@nestjs/common';
import { ActivosService } from './activos.service';
import {
  RespuestaValidacionQR,
  RespuestaRedireccionIncidencia,
  RespuestaEstadisticas,
  FiltroEstadisticasDto,
  Activo,
} from './interfaces/activo.interface';
import { CrearMantenimientoDto } from './dto/crear-mantenimiento.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';






@Controller('activos')
export class ActivosController {
  constructor(private readonly activosService: ActivosService) {}

  
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPERVISOR', 'ADMINISTRADOR')
  @Post('mantenimientos')
  async agendarMantenimiento(@Body() crearMantenimientoDto: CrearMantenimientoDto) {
    return {
      valido: true,
      mensaje: 'Mantenimiento agendado exitosamente (Simulado)',
      datos: crearMantenimientoDto,
    };
  }


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

  @Get()
  async listarActivos(): Promise<{ valido: boolean; total: number; datos: Activo[] }> {
    const activos = await this.activosService.listarTodos();
    return {
      valido: true,
      total: activos.length,
      datos: activos,
    };
  }
}