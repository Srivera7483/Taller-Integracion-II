import { FiltroEstadisticasDto } from '../interfaces/activo.interface';

export class ValidarFiltroEstadisticasDto {
  static sanitizar(filtros?: FiltroEstadisticasDto): FiltroEstadisticasDto {
    if (!filtros) {
      return {};
    }

    return {
      ubicacion: filtros.ubicacion ? filtros.ubicacion.trim() : undefined,
      categoria: filtros.categoria ? filtros.categoria.trim().toUpperCase() : undefined,
    };
  }
}
