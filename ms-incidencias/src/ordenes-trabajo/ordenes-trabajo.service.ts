import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { AsignarOrdenDto } from './dto/asignar-orden.dto';
import { FiltrarOrdenesDto } from './dto/filtrar-ordenes.dto';
import { sanitizeStringXss } from '../validators/sanitize-xss.pipe';
import {
  IncidenciasGateway,
  IncidenciaActualizadaPayload,
} from '../websockets/incidencias.gateway';
import { RabbitmqProducerService } from '../rabbitmq/rabbitmq-producer.service';

const ESTADOS_CERRADOS = [
  'completada',
  'resuelta',
  'rechazada',
  'cerrada',
  'cancelada',
];

@Injectable()
export class OrdenesTrabajoService {
  private readonly logger = new Logger(OrdenesTrabajoService.name);
  private readonly activosUrl =
    process.env.MS_ACTIVOS_URL ?? 'http://localhost:3003';
  private readonly edificioPorActivoCache = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly incidenciasGateway?: IncidenciasGateway,
    private readonly rabbitmqProducer?: RabbitmqProducerService,
    private readonly httpService?: HttpService,
  ) { }

  async obtenerEdificioDeActivo(
    idActivo?: string | null,
    authHeader?: string,
  ): Promise<string | null> {
    if (!idActivo) return null;
    if (this.edificioPorActivoCache.has(idActivo)) {
      return this.edificioPorActivoCache.get(idActivo) ?? null;
    }

    try {
      if (typeof this.httpService?.get === 'function') {
        const resp = await firstValueFrom(
          this.httpService.get(`${this.activosUrl}/api/v1/activos/${idActivo}`, {
            timeout: 1500,
            ...(authHeader ? { headers: { Authorization: authHeader } } : {}),
          }),
        );
        const data = resp?.data?.datos || resp?.data;
        const edificio =
          data?.id_edificio ||
          data?.idEdificio ||
          data?.edificio ||
          (data?.ubicacion ? this.extraerEdificio(data.ubicacion) : null);
        if (edificio) {
          const edificioStr = String(edificio);
          this.edificioPorActivoCache.set(idActivo, edificioStr);
          return edificioStr;
        }
      }
    } catch {
      // Fallback silencioso
    }

    return null;
  }

  private extraerEdificio(ubicacion: string): string | null {
    if (!ubicacion) return null;
    const match = ubicacion.match(/(?:Edificio\s+([A-Za-z0-9_-]+))/i);
    return match ? match[1] : ubicacion.split('-')[0].trim();
  }

  /**
   * Valida contra ms-auth que el técnico exista en BD, esté activo y posea rol TECNICO.
   */
  private async validarTecnicoEnAuth(
    idTecnico: string,
    authHeader?: string,
  ): Promise<any> {
    const baseUrls = Array.from(
      new Set(
        [
          process.env.MS_AUTH_URL,
          process.env.AUTH_SERVICE_URL,
          'http://localhost:3001',
          'http://ms-auth:3001',
        ]
          .filter((u): u is string => Boolean(u))
          .map((u) => u.replace(/\/$/, '')),
      ),
    );

    let usuarios: any[] | null = null;

    for (const baseUrl of baseUrls) {
      const endpoints = [
        `${baseUrl}/auth/usuarios?limit=50`,
        `${baseUrl}/auth/usuarios`,
        `${baseUrl}/usuarios?limit=50`,
        `${baseUrl}/usuarios`,
      ];

      for (const url of endpoints) {
        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout(2000),
            headers: {
              Accept: 'application/json',
              ...(authHeader ? { Authorization: authHeader } : {}),
            },
          });
          if (!res.ok) continue;
          const json = await res.json();
          const lista = json?.datos || json?.data || json?.usuarios || json;
          if (Array.isArray(lista)) {
            usuarios = lista;
            break;
          }
        } catch {
          // Intentar siguiente endpoint o host
        }
      }

      if (usuarios) break;
    }

    if (!usuarios) {
      throw new BadRequestException(
        'No fue posible verificar la validez del técnico con el servicio de autenticación.',
      );
    }

    const tecnico = usuarios.find((u) => (u.id_usuario || u.id) === idTecnico);
    if (!tecnico) {
      throw new NotFoundException(
        'El técnico seleccionado no existe en la base de datos.',
      );
    }

    if (tecnico.activo === false) {
      throw new BadRequestException(
        'No se puede asignar una orden a un técnico inactivo.',
      );
    }

    const rolNormalizado = JSON.stringify(
      tecnico.rol || tecnico.roles || tecnico.nombre_rol || '',
    )
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (!rolNormalizado.includes('TECNICO')) {
      throw new BadRequestException(
        'El usuario seleccionado no posee el rol de Técnico habilitado para órdenes de trabajo.',
      );
    }

    return tecnico;
  }

  async asignarOrden(
    dto: AsignarOrdenDto,
    usuarioCambioId: string,
    authHeader?: string,
  ) {
    if (!dto.id_incidencia || typeof dto.id_incidencia !== 'string') {
      throw new BadRequestException('El ID de la incidencia es obligatorio');
    }

    if (!dto.id_tecnico || typeof dto.id_tecnico !== 'string') {
      throw new BadRequestException('El ID del técnico es obligatorio');
    }

    const tecnico = await this.validarTecnicoEnAuth(dto.id_tecnico, authHeader);
    const nombreTecnico = tecnico
      ? `${tecnico.nombre || ''} ${tecnico.apellido || ''}`.trim() || tecnico.nombre
      : null;

    let idActivoIncidencia: string | null = null;
    let tituloIncidencia: string | null = null;

    const resultadoOrden = await this.prisma.$transaction(async (transaction) => {
      const incidencia = await transaction.incidencias.findUnique({
        where: { id_incidencia: dto.id_incidencia },
        include: {
          historial_estados: {
            orderBy: [{ fecha_creacion: 'desc' }, { id_historial: 'desc' }],
            take: 1,
            include: {
              estado: { select: { id_estado: true, nombre_estado: true } },
            },
          },
          ordenes_trabajo: {
            orderBy: [{ fecha_creacion: 'desc' }, { id_orden: 'desc' }],
            take: 1,
          },
        },
      });

      if (!incidencia) {
        throw new NotFoundException('Incidencia no encontrada');
      }

      tituloIncidencia = incidencia.titulo;
      idActivoIncidencia = incidencia.id_activo ?? null;

      const historialActual = incidencia.historial_estados?.[0] || null;
      const estadoActualObj = historialActual?.estado || null;
      const nombreEstadoActual = (
        estadoActualObj?.nombre_estado || 'Reportada'
      )
        .trim()
        .toLowerCase();

      if (ESTADOS_CERRADOS.includes(nombreEstadoActual)) {
        throw new BadRequestException(
          `No se puede asignar o reasignar una incidencia en estado "${estadoActualObj?.nombre_estado}".`,
        );
      }

      const ordenAnterior = incidencia.ordenes_trabajo?.[0] || null;
      if (ordenAnterior && ordenAnterior.id_tecnico === dto.id_tecnico) {
        throw new BadRequestException(
          'La incidencia ya se encuentra asignada actualmente a este mismo técnico.',
        );
      }

      const textoInicial = dto.diagnostico_tecnico ?? dto.instrucciones ?? null;
      const diagnosticoSanitizado = textoInicial
        ? sanitizeStringXss(textoInicial).trim()
        : null;

      // 1. Insertar nueva Orden de Trabajo (preserva las anteriores como historial auditable)
      const nuevaOrden = await transaction.ordenTrabajo.create({
        data: {
          id_incidencia: dto.id_incidencia,
          id_tecnico: dto.id_tecnico,
          diagnostico_tecnico: diagnosticoSanitizado,
        },
      });

      // 2. Buscar estado "Asignada" en el catálogo EstadoIncidencia
      const estadosCatalogo = await transaction.estadoIncidencia.findMany({
        orderBy: { id_estado: 'asc' },
      });
      const estadoAsignada =
        estadosCatalogo.find((e) => {
          const norm = e.nombre_estado
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
          return norm === 'asignada';
        }) || estadosCatalogo.find((e) => e.id_estado === 2);

      const idEstadoDestino =
        estadoAsignada?.id_estado ?? historialActual?.id_estado;

      // 3. Registrar trazabilidad de asignación / reasignación en HISTORIAL_ESTADOS
      if (idEstadoDestino) {
        await transaction.historialEstados.create({
          data: {
            id_incidencia: dto.id_incidencia,
            id_estado: idEstadoDestino,
            id_usuario_cambio: usuarioCambioId,
          },
        });
      }

      return {
        ...nuevaOrden,
        es_reasignacion: Boolean(ordenAnterior),
        tecnico_anterior_id: ordenAnterior?.id_tecnico || null,
        estado_incidencia:
          estadoAsignada?.nombre_estado ||
          estadoActualObj?.nombre_estado ||
          'Asignada',
      };
    });

    // Emisión en tiempo real vía WebSocket y Broker RabbitMQ (TAL-185 / TAL-11)
    const idEdificio = await this.obtenerEdificioDeActivo(
      idActivoIncidencia,
      authHeader,
    );

    const payloadWs: IncidenciaActualizadaPayload = {
      id_incidencia: dto.id_incidencia,
      id_orden: resultadoOrden.id_orden,
      titulo: tituloIncidencia ?? undefined,
      nuevo_estado: 'ASIGNADA',
      usuario_responsable: dto.id_tecnico,
      id_tecnico: dto.id_tecnico,
      nombre_tecnico: nombreTecnico ?? undefined,
      es_reasignacion: Boolean(resultadoOrden.es_reasignacion),
      tecnico_anterior_id: resultadoOrden.tecnico_anterior_id ?? undefined,
      accion: resultadoOrden.es_reasignacion ? 'REASIGNACION' : 'ASIGNACION',
      id_edificio: idEdificio,
      timestamp: new Date().toISOString(),
      tipo_evento: 'ASIGNACION_ORDEN',
    };

    if (this.incidenciasGateway) {
      this.incidenciasGateway.emitirIncidenciaActualizada(payloadWs, idEdificio);
    }

    if (this.rabbitmqProducer) {
      this.rabbitmqProducer
        .emitirIncidenciaActualizada({
          evento: 'ORDEN_TRABAJO_ASIGNADA',
          ...payloadWs,
        })
        .catch((err) => {
          this.logger.error(
            `[RABBITMQ] Error no controlado al emitir asignacion de orden: ${err}`,
          );
        });
    }

    return resultadoOrden;
  }

  async listarTodas(filtros?: FiltrarOrdenesDto) {
    const page = Math.max(1, Number(filtros?.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(filtros?.limit) || 10));
    const skip = (page - 1) * limit;
    const orden = filtros?.orden?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const [total, ordenes] = await Promise.all([
      this.prisma.ordenTrabajo.count(),
      this.prisma.ordenTrabajo.findMany({
        include: {
          incidencia: {
            include: {
              evidencias: true,
              historial_estados: {
                orderBy: [{ fecha_creacion: 'desc' }, { id_historial: 'desc' }],
                take: 1,
                include: {
                  estado: { select: { id_estado: true, nombre_estado: true } },
                },
              },
            },
          },
        },
        orderBy: [{ fecha_creacion: orden }, { id_orden: orden }],
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      totalItems: total,
      page,
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      data: ordenes,
    };
  }

  async listarPorTecnico(idTecnico: string, filtros?: FiltrarOrdenesDto) {
    if (!idTecnico || typeof idTecnico !== 'string') {
      throw new BadRequestException('El ID del técnico es obligatorio');
    }

    const page = Math.max(1, Number(filtros?.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(filtros?.limit) || 10));
    const skip = (page - 1) * limit;
    const orden = filtros?.orden?.toLowerCase() === 'asc' ? 'asc' : 'desc';

    const where: {
      id_tecnico: string;
      fecha_creacion?: { gte?: Date; lte?: Date };
    } = {
      id_tecnico: idTecnico,
    };

    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fecha_creacion = {};
      if (filtros.fechaDesde) {
        where.fecha_creacion.gte = new Date(filtros.fechaDesde);
      }
      if (filtros.fechaHasta) {
        where.fecha_creacion.lte = new Date(filtros.fechaHasta);
      }
    }

    const ordenes = await this.prisma.ordenTrabajo.findMany({
      where,
      include: {
        incidencia: {
          include: {
            evidencias: true,
            historial_estados: {
              orderBy: [{ fecha_creacion: 'desc' }, { id_historial: 'desc' }],
              take: 1,
              include: {
                estado: { select: { id_estado: true, nombre_estado: true } },
              },
            },
            ordenes_trabajo: {
              orderBy: [{ fecha_creacion: 'desc' }, { id_orden: 'desc' }],
              take: 1,
            },
          },
        },
      },
      orderBy: [{ fecha_creacion: orden }, { id_orden: orden }],
    });

    // Conservar solo órdenes vigentes donde este técnico sigue siendo el último asignado
    const ordenesVigentes = ordenes.filter((ot) => {
      const ultimaOt = ot.incidencia?.ordenes_trabajo?.[0];
      return !ultimaOt || ultimaOt.id_orden === ot.id_orden;
    });

    const total = ordenesVigentes.length;
    const paginadas = ordenesVigentes.slice(skip, skip + limit);

    return {
      total,
      totalItems: total,
      page,
      currentPage: page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      data: paginadas,
    };
  }

  async obtenerPorId(idOrden: string) {
    const orden = await this.prisma.ordenTrabajo.findUnique({
      where: { id_orden: idOrden },
      include: {
        incidencia: {
          include: {
            evidencias: true,
            historial_estados: {
              orderBy: [{ fecha_creacion: 'desc' }, { id_historial: 'desc' }],
              take: 1,
              include: {
                estado: { select: { id_estado: true, nombre_estado: true } },
              },
            },
          },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    return orden;
  }

  async actualizarDiagnostico(
    idOrden: string,
    diagnostico_tecnico: string,
    idTecnicoPeticion: string,
    rolUsuario?: string,
  ) {
    const orden = await this.prisma.ordenTrabajo.findUnique({
      where: { id_orden: idOrden },
      include: {
        incidencia: {
          include: {
            historial_estados: {
              orderBy: [{ fecha_creacion: 'desc' }, { id_historial: 'desc' }],
              take: 1,
              include: {
                estado: { select: { id_estado: true, nombre_estado: true } },
              },
            },
            ordenes_trabajo: {
              orderBy: [{ fecha_creacion: 'desc' }, { id_orden: 'desc' }],
              take: 1,
            },
          },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    const ultimaOrdenVigente = orden.incidencia?.ordenes_trabajo?.[0];
    if (ultimaOrdenVigente && ultimaOrdenVigente.id_orden !== orden.id_orden) {
      throw new ForbiddenException(
        'Acceso denegado: Esta orden de trabajo fue reasignada a otro técnico.',
      );
    }

    const rolUpper = (rolUsuario || '').toUpperCase();
    const esSupervisorOAdmin = ['SUPERVISOR', 'ADMINISTRADOR'].includes(rolUpper);
    if (!esSupervisorOAdmin && orden.id_tecnico !== idTecnicoPeticion) {
      throw new ForbiddenException(
        'Acceso denegado: Solo el técnico actualmente asignado puede registrar el diagnóstico o resolución.',
      );
    }

    const diagnosticoSanitizado = sanitizeStringXss(diagnostico_tecnico).trim();

    return this.prisma.ordenTrabajo.update({
      where: { id_orden: idOrden },
      data: { diagnostico_tecnico: diagnosticoSanitizado },
    });
  }

  async registrarDiagnostico(
    dto: AsignarOrdenDto,
    idUsuario: string,
    rolUsuario?: string,
  ) {
    if (!dto.id_incidencia) {
      throw new BadRequestException('El ID de la incidencia es obligatorio');
    }

    if (!dto.diagnostico_tecnico?.trim()) {
      throw new BadRequestException('El diagnóstico es obligatorio');
    }

    const rolNorm = (rolUsuario || '').toUpperCase();
    const esSupervisorOAdmin = ['SUPERVISOR', 'ADMINISTRADOR'].includes(rolNorm);
    const idTecnico = esSupervisorOAdmin
      ? dto.id_tecnico || idUsuario
      : idUsuario;

    if (!idTecnico) {
      throw new BadRequestException('El ID del técnico es obligatorio');
    }

    const diagnosticoSanitizado =
      sanitizeStringXss(dto.diagnostico_tecnico).trim();

    return this.prisma.$transaction(async (transaction) => {
      const incidencia = await transaction.incidencias.findUnique({
        where: { id_incidencia: dto.id_incidencia },
        select: { id_incidencia: true },
      });

      if (!incidencia) {
        throw new NotFoundException('Incidencia no encontrada');
      }

      const ordenExistente = await transaction.ordenTrabajo.findFirst({
        where: { id_incidencia: dto.id_incidencia },
        orderBy: [{ fecha_creacion: 'desc' }, { id_orden: 'desc' }],
      });

      if (ordenExistente) {
        if (ordenExistente.id_tecnico !== idUsuario && !esSupervisorOAdmin) {
          throw new ForbiddenException(
            'Solo el técnico asignado, un supervisor o un administrador pueden modificar esta orden.',
          );
        }

        return transaction.ordenTrabajo.update({
          where: { id_orden: ordenExistente.id_orden },
          data: { diagnostico_tecnico: diagnosticoSanitizado },
        });
      }

      return transaction.ordenTrabajo.create({
        data: {
          id_incidencia: dto.id_incidencia,
          id_tecnico: idTecnico,
          diagnostico_tecnico: diagnosticoSanitizado,
        },
      });
    });
  }
}