import { ArrayMaxSize, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SyncActionDto } from './sync-action.dto';

/**
 * TAL-192: Cuerpo de la petición de sincronización masiva en lote.
 *
 * El arreglo principal se limita a un máximo de 50 elementos
 * (@ArrayMaxSize(50), @ArrayMinSize(1)) para reducir el consumo de batería
 * y datos en dispositivos móviles, enviando un lote en lugar de peticiones
 * individuales en paralelo.
 */
export class BatchSyncDto {
  @ApiProperty({
    description: 'Arreglo de acciones offline a sincronizar (mínimo 1, máximo 50).',
    type: [SyncActionDto],
    minItems: 1,
    maxItems: 50,
  })
  @ArrayMinSize(1, { message: 'El lote debe contener al menos 1 acción' })
  @ArrayMaxSize(50, {
    message: 'El lote no puede exceder las 50 acciones por llamada HTTP',
  })
  @ValidateNested({ each: true })
  @Type(() => SyncActionDto)
  acciones!: SyncActionDto[];
}
