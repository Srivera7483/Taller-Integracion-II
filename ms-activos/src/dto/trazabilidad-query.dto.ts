import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TrazabilidadQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50, { message: 'El límite máximo permitido es de 50 registros por petición' })
  limit?: number = 10;

  @IsOptional()
  @IsString()
  tipoFiltro?: string = 'todos';

  static sanitizar(dto?: TrazabilidadQueryDto): { page: number; limit: number; tipoFiltro: string } {
    const page = Math.max(1, Number(dto?.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(dto?.limit) || 10));
    const tipoFiltro = (dto?.tipoFiltro || 'todos').trim().toLowerCase();
    return { page, limit, tipoFiltro };
  }
}
