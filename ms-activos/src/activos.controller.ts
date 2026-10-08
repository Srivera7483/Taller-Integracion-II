import { ActivosService } from './activos.service';
import {
  RespuestaValidacionQR,
  RespuestaRedireccionIncidencia,
  RespuestaEstadisticas,
  FiltroEstadisticasDto,
  Activo,
} from './interfaces/activo.interface';

export class ActivosController {
  private activosService: ActivosService;

  constructor(activosService?: ActivosService) {
    this.activosService = activosService || new ActivosService();
  }

  async validarCodigoQr(codigoQr: string): Promise<{ statusCode: number; body: RespuestaValidacionQR }> {
    const resultado = await this.activosService.validarCodigoQR(codigoQr);

    if (resultado.valido) {
      return {
        statusCode: 200,
        body: resultado,
      };
    }

    const esNoEncontrado = resultado.mensaje.includes('No se encontró');
    return {
      statusCode: esNoEncontrado ? 404 : 400,
      body: resultado,
    };
  }

  async obtenerRedireccionIncidencia(
    codigoQr: string,
  ): Promise<{ statusCode: number; body: RespuestaRedireccionIncidencia }> {
    const resultado = await this.activosService.generarEnlaceIncidencia(codigoQr);

    if (resultado.valido) {
      return {
        statusCode: 200,
        body: resultado,
      };
    }

    const esNoEncontrado = resultado.mensaje.includes('No se encontró');
    return {
      statusCode: esNoEncontrado ? 404 : 400,
      body: resultado,
    };
  }

  async obtenerEstadisticas(
    filtros?: FiltroEstadisticasDto,
  ): Promise<{ statusCode: number; body: RespuestaEstadisticas }> {
    const resultado = await this.activosService.obtenerEstadisticas(filtros);

    return {
      statusCode: 200,
      body: resultado,
    };
  }

  async listarActivos(): Promise<{ statusCode: number; body: { valido: boolean; total: number; datos: Activo[] } }> {
    const activos = await this.activosService.listarTodos();

    return {
      statusCode: 200,
      body: {
        valido: true,
        total: activos.length,
        datos: activos,
      },
    };
  }
}
