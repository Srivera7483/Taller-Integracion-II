import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { EstadoItemSincronizacion } from '../sincronizacion.types';

/**
 * TAL-192: Resultado de una acción individual dentro del lote.
 */
export class ItemResultadoDto {
  @ApiProperty({
    description: 'Identificador local de la acción procesada.',
    example: 'acc-loc-001',
  })
  @IsString()
  @IsNotEmpty()
  id_accion_local!: string;

  @ApiProperty({
    description: 'Estado de confirmación de la acción.',
    enum: ['OK', 'ERROR'],
    example: 'OK',
  })
  @IsIn(['OK', 'ERROR'])
  estado!: EstadoItemSincronizacion;

  @ApiPropertyOptional({
    description:
      'Identificador del recurso creado/actualizado (solo cuando estado === OK).',
    example: 'f7a2b3c4-d5e6-4a7b-8c9d-0123456789ab',
  })
  @IsOptional()
  @IsString()
  recurso_id?: string;

  @ApiPropertyOptional({
    description: 'Motivo del error (solo cuando estado === ERROR).',
    example: 'Permiso insuficiente: evidencias:subir',
  })
  @IsOptional()
  @IsString()
  motivo?: string;
}

/**
 * TAL-192: Resumen agregado del lote.
 */
export class ResumenLoteDto {
  @ApiProperty({ example: 3 })
  total!: number;

  @ApiProperty({ example: 2 })
  exitosos!: number;

  @ApiProperty({ example: 1 })
  errores!: number;
}

/**
 * TAL-192: Respuesta del endpoint POST /sincronizacion/lote.
 *
 * Responde 200 cuando todas las acciones son exitosas y 207 (Multi-Status)
 * cuando existe al menos una acción con error, incluyendo siempre el reporte
 * detallado por ítem para que el cliente móvil reintente únicamente las fallidas.
 */
export class BatchSyncResponseDto {
  @ApiProperty({
    description: 'Código de estado del lote (200 = todo OK, 207 = errores parciales).',
    enum: [200, 207],
    example: 207,
  })
  statusCode!: number;

  @ApiProperty({
    description: 'Mensaje agregado del resultado del lote.',
    example:
      'Lote procesado con errores parciales: 2 exitosas, 1 fallida.',
  })
  message!: string;

  @ApiProperty({ type: ResumenLoteDto })
  resumen!: ResumenLoteDto;

  @ApiProperty({
    description: 'Reporte detallado con el estado de cada acción del lote.',
    type: [ItemResultadoDto],
  })
  detalle!: ItemResultadoDto[];
}
