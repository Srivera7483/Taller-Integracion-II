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
 * TAL-192: Acción individual de sincronización offline.
 *
 * Estructura recibida del cliente móvil:
 * { id_accion_local, tipo, payload, timestamp_local }
 */
export class SyncActionDto {
  @ApiProperty({
    description:
      'Identificador local de la acción generado por el cliente móvil mientras estuvo offline.',
    example: 'acc-loc-001',
  })
  @IsString()
  @IsNotEmpty({ message: 'id_accion_local es obligatorio' })
  id_accion_local!: string;

  @ApiProperty({
    description: 'Tipo de acción a ejecutar.',
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
      'Payload de la acción. Su estructura depende del tipo (ver documentación del endpoint).',
    type: 'object',
    additionalProperties: true,
    example: { id_activo: '...', titulo: 'Falla de luz', descripcion: '...' },
  })
  @IsOptional()
  @IsObject({ message: 'payload debe ser un objeto válido' })
  payload?: Record<string, any>;

  @ApiProperty({
    description:
      'Timestamp local del dispositivo en formato ISO 8601 (hora de creación de la acción offline).',
    example: '2026-11-20T10:15:30.000Z',
  })
  @IsString()
  @IsNotEmpty({ message: 'timestamp_local es obligatorio' })
  @IsISO8601(
    { strict: true },
    { message: 'timestamp_local debe ser una fecha ISO 8601 válida' },
  )
  timestamp_local!: string;
}
