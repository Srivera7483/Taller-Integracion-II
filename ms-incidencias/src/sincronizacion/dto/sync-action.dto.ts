import {
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TIPOS_ACCION_VALIDOS } from '../sincronizacion.types';

/**
 * TAL-192: AcciÃ³n individual de sincronizaciÃ³n offline.
 *
 * Estructura recibida del cliente mÃ³vil:
 * { id_accion_local, tipo, payload, timestamp_local }
 */
export class SyncActionDto {
  @ApiProperty({
    description:
      'Identificador local de la acciÃ³n generado por el cliente mÃ³vil mientras estuvo offline.',
    example: 'acc-loc-001',
  })
  @IsString()
  @IsNotEmpty({ message: 'id_accion_local es obligatorio' })
  id_accion_local!: string;

  @ApiProperty({
    description: 'Tipo de acciÃ³n a ejecutar.',
    enum: TIPOS_ACCION_VALIDOS,
    example: 'crear_incidencia',
  })
  @IsString()
  @IsNotEmpty({ message: 'tipo es obligatorio' })
  @IsIn(TIPOS_ACCION_VALIDOS, {
    message: `tipo debe ser uno de: ${TIPOS_ACCION_VALIDOS.join(', ')}`,
  })
  tipo!: string;

  @ApiPropertyOptional({
    description:
      'Payload de la acciÃ³n. Su estructura depende del tipo (ver documentaciÃ³n del endpoint).',
    type: 'object',
    additionalProperties: true,
    example: { id_activo: '...', titulo: 'Falla de luz', descripcion: '...' },
  })
  @IsOptional()
  @IsObject({ message: 'payload debe ser un objeto vÃ¡lido' })
  payload?: Record<string, any>;

  @ApiProperty({
    description:
      'Timestamp local del dispositivo en formato ISO 8601 (hora de creaciÃ³n de la acciÃ³n offline).',
    example: '2026-11-20T10:15:30.000Z',
  })
  @IsString()
  @IsNotEmpty({ message: 'timestamp_local es obligatorio' })
  @IsISO8601(
    { strict: true },
    { message: 'timestamp_local debe ser una fecha ISO 8601 vÃ¡lida' },
  )
  timestamp_local!: string;
}

