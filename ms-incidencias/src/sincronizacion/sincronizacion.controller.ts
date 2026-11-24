import {
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtUser } from '../auth/auth.types';
import { BatchSyncDto } from './dto/batch-sync.dto';
import { BatchSyncResponseDto } from './dto/sync-resultado.dto';
import { SincronizacionService } from './sincronizacion.service';

/**
 * TAL-192: Endpoint de sincronización masiva en lote para datos offline.
 *
 * Ruta: POST /sincronizacion/lote (expuesta por el API Gateway en /api/v1/sincronizacion/lote).
 *
 * Seguridad:
 * - JWT validado por el APP_GUARD global (JwtAuthGuard).
 * - Permisos granulares verificados por acción dentro del servicio (RBAC TAL-97),
 *   ya que el permiso requerido varía según el tipo de cada acción del lote.
 */
@Controller('sincronizacion')
@UseGuards(JwtAuthGuard)
@ApiTags('Sincronizacion Offline')
@ApiBearerAuth()
export class SincronizacionController {
  constructor(
    private readonly sincronizacionService: SincronizacionService,
  ) {}

  @Post('lote')
  @ApiOperation({
    summary:
      'Sincronización masiva en lote de acciones realizadas offline',
    description: `Procesa hasta 50 acciones en una sola llamada HTTP.
Cada acción se ejecuta de forma aislada: si una falla (validación de datos o
permiso insuficiente), las acciones válidas sí se persisten y se confirma.
Responde HTTP 207 cuando existe al menos una acción con error y 200 cuando
todas son exitosas, incluyendo siempre un reporte detallado por ítem.`,
  })
  @ApiBody({ type: BatchSyncDto })
  @ApiResponse({
    status: 200,
    description: 'Todas las acciones se procesaron con éxito.',
    type: BatchSyncResponseDto,
  })
  @ApiResponse({
    status: 207,
    description:
      'Procesamiento con errores parciales (al menos una acción falló).',
    type: BatchSyncResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Cuerpo de la petición inválido (más de 50 acciones, estructura incorrecta, campos requeridos faltantes, etc.).',
  })
  @ApiResponse({
    status: 401,
    description: 'Token JWT inválido o ausente.',
  })
  async sincronizarLote(
    @Body() dto: BatchSyncDto,
    @CurrentUser() usuario: JwtUser,
  ): Promise<BatchSyncResponseDto> {
    const resultado = await this.sincronizacionService.procesarLote(
      dto.acciones,
      usuario,
    );

    return {
      statusCode: resultado.statusCode,
      message: resultado.message,
      resumen: resultado.resumen,
      detalle: resultado.detalle.map((d) => ({
        id_accion_local: d.id_accion_local,
        estado: d.estado,
        recurso_id: d.recurso_id,
        motivo: d.motivo,
      })),
    };
  }
}
