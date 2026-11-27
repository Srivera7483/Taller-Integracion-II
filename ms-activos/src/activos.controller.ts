import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { PermissionsGuard } from './permissions.guard';
import { RequirePermissions } from './permissions.decorator';
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
@UseGuards(PermissionsGuard)
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
  @RequirePermissions('estadisticas:ver')
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

  @Get(':id_activo')
  async obtenerActivoPorId(@Param('id_activo') idActivo: string) {
    const activo = await this.activosService.obtenerPorId(idActivo);
    if (!activo) {
      throw new NotFoundException(
        `No se encontró ningún activo registrado con el identificador '${idActivo}'.`,
      );
    }

    return {
      ...activo,
      id_activo: activo.id,
      codigo_qr: activo.codigoQr,
      numero_serie: activo.numeroSerie ?? null,
      fecha_creacion: activo.fechaRegistro,
    };
  }

  @Get()
  async listarActivos(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('limite') limite?: string,
    @Query('busqueda') busqueda?: string,
  ): Promise<{
    valido: boolean;
    total: number;
    totalItems: number;
    totalPages: number;
    currentPage: number;
    limit: number;
    datos: Activo[];
  }> {
    const rawLimit = limit ?? limite;
    const pageNum = Math.max(1, parseInt(page || '1', 10) || 1);
    const limitNum = Math.max(1, Math.min(50, parseInt(rawLimit || '20', 10) || 20));
    const activos = await this.activosService.listarTodos({
      page: pageNum,
      limit: limitNum,
      busqueda,
    });
    const total = await this.activosService.contarTotalActivos(busqueda);
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

  @Post()
  @RequirePermissions('activos:gestionar')
  async crearActivo(@Body() body: any) {
    const creado = await this.activosService.crearActivo(body);
    return {
      valido: true,
      mensaje: 'Activo registrado exitosamente en el inventario.',
      datos: creado,
    };
  }

  @Patch(':id_activo')
  @RequirePermissions('activos:gestionar')
  async actualizarActivo(
    @Param('id_activo') idActivo: string,
    @Body() body: any,
  ) {
    const actualizado = await this.activosService.actualizarActivo(idActivo, body);
    return {
      valido: true,
      mensaje: 'Activo actualizado exitosamente.',
      datos: actualizado,
    };
  }

  @Delete(':id_activo')
  @RequirePermissions('activos:gestionar')
  async darDeBajaActivo(@Param('id_activo') idActivo: string) {
    const dadoDeBaja = await this.activosService.darDeBajaActivo(idActivo);
    return {
      valido: true,
      mensaje: 'Activo dado de baja exitosamente.',
      datos: dadoDeBaja,
    };
  }
}
