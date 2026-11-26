import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrioridadIncidencia } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IncidenciasService } from '../incidencias/incidencias.service';
import type { CrearIncidenciaDto } from '../incidencias/dto/crear-incidencia.dto';
import type { JwtUser } from '../auth/auth.types';
import type { SyncActionDto } from './dto/sync-action.dto';
import {
  ItemResultadoSincronizacion,
  PERMISO_POR_TIPO_ACCION,
  ResultadoLoteSincronizacion,
  TIPOS_ACCION_VALIDOS,
} from './sincronizacion.types';

/**
 * TAL-192: Servicio de sincronización masiva en lote para datos offline.
 *
 * Procesa cada acción del lote de forma aislada (ordenada por timestamp_local,
 * try/catch por ítem y transacción por escritura). El fallo de una acción no
 * revierte las acciones válidas ya aplicadas (Partial Success).
 */
@Injectable()
export class SincronizacionService {
  private readonly logger = new Logger(SincronizacionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly incidenciasService: IncidenciasService,
  ) {}

  async procesarLote(
    acciones: SyncActionDto[],
    usuario: JwtUser,
  ): Promise<ResultadoLoteSincronizacion> {
    const idUsuario = usuario.sub || usuario.userId;
    const emailUsuario = usuario.email;
    const permisosUsuario: string[] = usuario.permissions ?? [];

    if (!idUsuario) {
      throw new BadRequestException('Usuario autenticado inválido');
    }

    // Respetar el orden cronológico en que el cliente registró las acciones offline.
    const accionesOrdenadas = [...acciones].sort(
      (a, b) => Date.parse(a.timestamp_local) - Date.parse(b.timestamp_local),
    );

    const detalle: ItemResultadoSincronizacion[] = [];

    for (const accion of accionesOrdenadas) {
      const resultadoItem: ItemResultadoSincronizacion = {
        id_accion_local: accion.id_accion_local,
        estado: 'ERROR',
      };

      try {
        // 1. Validación de permiso granular por tipo de acción (TAL-97 / RBAC).
        const permisoRequerido = PERMISO_POR_TIPO_ACCION[accion.tipo];
        if (!permisoRequerido || !TIPOS_ACCION_VALIDOS.includes(accion.tipo)) {
          throw new BadRequestException(
            `Tipo de acción no soportado: ${accion.tipo}`,
          );
        }
        if (!permisosUsuario.includes(permisoRequerido)) {
          throw new BadRequestException(
            `Permiso insuficiente para ejecutar '${accion.tipo}': se requiere '${permisoRequerido}'`,
          );
        }

        // 2. Ejecución aislada por tipo de acción.
        switch (accion.tipo) {
          case 'crear_incidencia': {
            const recurso_id = await this.ejecutarCrearIncidencia(
              accion,
              idUsuario,
              emailUsuario,
            );
            resultadoItem.recurso_id = recurso_id;
            break;
          }
          case 'subir_evidencia': {
            const recurso_id = await this.ejecutarSubirEvidencia(
              accion,
              idUsuario,
            );
            resultadoItem.recurso_id = recurso_id;
            break;
          }

          case 'actualizar_estado': {
            const recurso_id = await this.ejecutarActualizarEstado(
              accion,
              idUsuario,
            );
            resultadoItem.recurso_id = recurso_id;
            break;
          }
          default:
            throw new BadRequestException(
              `Tipo de acción no implementado: ${accion.tipo}`,
            );
        }

        resultadoItem.estado = 'OK';
      } catch (error: any) {
        // Fallo aislado: se registra y se continúa con la siguiente acción.
        // NO se hace rollback de las acciones válidas ya persistidas.
        resultadoItem.motivo =
          error?.message ||
          error?.toString() ||
          'Error inesperado al procesar la acción';
        this.logger.warn(
          `[Sincronizacion] Acción ${accion.id_accion_local} (${accion.tipo}) falló: ${resultadoItem.motivo}`,
        );
      }

      detalle.push(resultadoItem);
    }

    const exitosos = detalle.filter((d) => d.estado === 'OK').length;
    const errores = detalle.length - exitosos;
    const statusCode = errores > 0 ? 207 : 200;

    return {
      statusCode,
      message:
        errores > 0
          ? `Lote procesado con errores parciales: ${exitosos} exitosas, ${errores} fallidas.`
          : 'Todas las acciones del lote se procesaron correctamente.',
      resumen: { total: detalle.length, exitosos, errores },
      detalle,
    };
  }

  private async ejecutarCrearIncidencia(
    accion: SyncActionDto,
    idUsuario: string,
    emailUsuario?: string,
  ): Promise<string> {
    const payload = accion.payload ?? {};
    const idActivo = payload.id_activo;
    const titulo = payload.titulo;
    const descripcion = payload.descripcion;

    if (!idActivo || typeof idActivo !== 'string') {
      throw new BadRequestException('id_activo es obligatorio en el payload');
    }
    if (!titulo || typeof titulo !== 'string' || !titulo.trim()) {
      throw new BadRequestException('titulo es obligatorio en el payload');
    }
    if (
      !descripcion ||
      typeof descripcion !== 'string' ||
      !descripcion.trim()
    ) {
      throw new BadRequestException('descripcion es obligatorio en el payload');
    }

    const crearDto: CrearIncidenciaDto = {
      id_activo: idActivo,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      prioridad: this.normalizarPrioridad(payload.prioridad),
    };

    const creada = await this.incidenciasService.crear(
      crearDto,
      idUsuario,
      emailUsuario,
    );
    if (!creada?.id_incidencia) {
      throw new Error(
        'No se obtuvo id_incidencia tras crear la incidencia',
      );
    }
    return creada.id_incidencia;
  }

  private async ejecutarSubirEvidencia(
    accion: SyncActionDto,
    idUsuario: string,
  ): Promise<string> {
    const payload = accion.payload ?? {};
    const idIncidencia = payload.id_incidencia;
    const idTipoEvidencia = payload.id_tipo_evidencia;
    const urlEvidencia = payload.url_evidencia;

    if (!idIncidencia || typeof idIncidencia !== 'string') {
      throw new BadRequestException(
        'id_incidencia es obligatorio en el payload',
      );
    }
    if (!urlEvidencia || typeof urlEvidencia !== 'string') {
      throw new BadRequestException(
        'url_evidencia es obligatorio en el payload',
      );
    }
    if (!idTipoEvidencia) {
      throw new BadRequestException(
        'id_tipo_evidencia es obligatorio en el payload',
      );
    }

    const evidencia = await this.prisma.$transaction(async (tx) => {
      const incidencia = await tx.incidencias.findUnique({
        where: { id_incidencia: idIncidencia },
      });
      if (!incidencia) {
        throw new NotFoundException('La incidencia referenciada no existe');
      }

      const tipoEvidencia = await tx.tipoEvidencia.findUnique({
        where: { id_tipo_evidencia: Number(idTipoEvidencia) },
      });
      if (!tipoEvidencia) {
        throw new NotFoundException(
          'El tipo de evidencia indicado no existe',
        );
      }

      return tx.evidencia.create({
        data: {
          id_incidencia: idIncidencia,
          id_tipo_evidencia: Number(idTipoEvidencia),
          url_cloudinary: urlEvidencia,
        },
      });
    });

    if (!evidencia?.id_evidencia) {
      throw new Error(
        'No se obtuvo id_evidencia tras crear la evidencia',
      );
    }
    return evidencia.id_evidencia;
  }

  private async ejecutarActualizarEstado(
    accion: SyncActionDto,
    idUsuario: string,
  ): Promise<string> {
    const payload = accion.payload ?? {};
    const idIncidencia = payload.id_incidencia;
    const idEstado = payload.id_estado;

    if (!idIncidencia || typeof idIncidencia !== 'string') {
      throw new BadRequestException(
        'id_incidencia es obligatorio en el payload',
      );
    }
    if (!idEstado) {
      throw new BadRequestException('id_estado es obligatorio en el payload');
    }

    await this.prisma.$transaction(async (tx) => {
      const incidencia = await tx.incidencias.findUnique({
        where: { id_incidencia: idIncidencia },
      });
      if (!incidencia) {
        throw new NotFoundException('La incidencia referenciada no existe');
      }

      const estado = await tx.estadoIncidencia.findUnique({
        where: { id_estado: Number(idEstado) },
      });
      if (!estado) {
        throw new NotFoundException(
          'El estado de incidencia indicado no existe',
        );
      }

      await tx.historialEstados.create({
        data: {
          id_incidencia: idIncidencia,
          id_estado: Number(idEstado),
          id_usuario_cambio: idUsuario,
        },
      });
    });

    return idIncidencia;
  }

  private normalizarPrioridad(
    valor: any,
  ): PrioridadIncidencia | undefined {
    if (!valor) return PrioridadIncidencia.media;
    const v = String(valor).toLowerCase();
    switch (v) {
      case 'baja':
        return PrioridadIncidencia.baja;
      case 'media':
        return PrioridadIncidencia.media;
      case 'alta':
        return PrioridadIncidencia.alta;
      default:
        return PrioridadIncidencia.media;
    }
  }
}
