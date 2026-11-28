import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Prisma, PrioridadIncidencia } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import type { CrearEvidenciaDto } from './dto/crear-evidencia.dto';
import type { CrearIncidenciaDto } from './dto/crear-incidencia.dto';
import type { ListarIncidenciasQueryDto } from './dto/listar-incidencias-query.dto';
import { PrioridadDinamicaService } from './prioridad-dinamica.service';
import type { PrioridadDinamicaQueryDto } from './dto/prioridad-dinamica-query.dto';
import { ExportarIncidenciasService } from './exportar-incidencias.service';
import type { ExportarIncidenciasQueryDto } from './dto/exportar-incidencias-query.dto';
import { RabbitmqProducerService } from '../rabbitmq/rabbitmq-producer.service';
import { CloudinaryService } from './cloudinary.service';
import {
  IncidenciasGateway,
  IncidenciaActualizadaPayload,
} from '../websockets/incidencias.gateway';

const incidenciaConEstadoActual = {
  include: {
    historial_estados: {
      orderBy: [{ fecha_creacion: 'desc' as const }, { id_historial: 'desc' as const }],
      take: 1,
      include: { estado: { select: { id_estado: true, nombre_estado: true } } },
    },
    evidencias: {
      include: { tipo_evidencia: true },
      orderBy: { fecha_creacion: 'desc' as const },
    },
    ordenes_trabajo: {
      orderBy: [{ fecha_creacion: 'desc' as const }, { id_orden: 'desc' as const }],
    },
  },
} satisfies Prisma.IncidenciasDefaultArgs;

type IncidenciaConEstadoActual = Prisma.IncidenciasGetPayload<
  typeof incidenciaConEstadoActual
>;

@Injectable()
export class IncidenciasService {
  private readonly logger = new Logger(IncidenciasService.name);
  private readonly notificacionesUrl =
    process.env.MS_NOTIFICACIONES_URL ??
    'http://ms-notificaciones:3004/notificar';
  private readonly activosUrl =
    process.env.MS_ACTIVOS_URL ?? 'http://localhost:3003';
  private readonly authUrl =
    process.env.MS_AUTH_URL ?? 'http://localhost:3001';
  private readonly edificioPorActivoCache = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly rabbitmqProducer?: RabbitmqProducerService,
    private readonly prioridadDinamicaService: PrioridadDinamicaService = new PrioridadDinamicaService(),
    private readonly exportarIncidenciasService: ExportarIncidenciasService = new ExportarIncidenciasService(),
    private readonly cloudinaryService: CloudinaryService = new CloudinaryService(),
    private readonly incidenciasGateway?: IncidenciasGateway,
  ) {}

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
      // Ignorar fallback si ms-activos no responde
    }

    return null;
  }

  private extraerEdificio(ubicacion: string): string | null {
    if (!ubicacion) return null;
    const match = ubicacion.match(/(?:Edificio\s+([A-Za-z0-9_-]+))/i);
    return match ? match[1] : ubicacion.split('-')[0].trim();
  }

  private esIncidenciaCritica(
    prioridad: PrioridadIncidencia,
  ): boolean {
    return (
      prioridad === PrioridadIncidencia.alta ||
      prioridad === PrioridadIncidencia.critica
    );
  }

  private async obtenerEmailReportante(
    idReportante?: string | null,
    emailFallback?: string,
    authHeader?: string,
  ): Promise<string | undefined> {
    if (idReportante) {
      try {
        const usuarios = await this.resolverUsuarios(authHeader);
        const emailResuelto = usuarios.get(idReportante)?.email?.trim();
        if (emailResuelto && emailResuelto.includes('@')) {
          return emailResuelto;
        }
      } catch {
        // Usar fallback si ms-auth o BD compartida no están disponibles
      }
    }
    const fallbackLimpio = emailFallback?.trim();
    return fallbackLimpio && fallbackLimpio.includes('@')
      ? fallbackLimpio
      : undefined;
  }

  /**
   * TAL-221: Verifica que el técnico que intenta operar sobre una incidencia
   * sea exactamente el titular de la Orden de Trabajo vigente (más reciente).
   */
  private async verificarOwnershipTecnico(
    idIncidencia: string,
    idTecnico: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<void> {
    const ultimaOrden = await client.ordenTrabajo.findFirst({
      where: { id_incidencia: idIncidencia },
      orderBy: [{ fecha_creacion: 'desc' }, { id_orden: 'desc' }],
    });

    if (!ultimaOrden || ultimaOrden.id_tecnico !== idTecnico) {
      throw new ForbiddenException(
        'Acceso denegado: Esta incidencia no está asignada a tu usuario o fue reasignada a otro técnico.',
      );
    }
  }

  async listar(query: ListarIncidenciasQueryDto, authHeader?: string) {
    const limite = query.limite ?? query.limit ?? 20;
    const pagina = query.pagina ?? query.page ?? 1;
    const offset = (pagina - 1) * limite;
    const idActivo = query.id_activo ?? null;
    const idEstado = query.id_estado ?? null;
    const idTecnico = query.id_tecnico ?? null;
    const idReportante = query.id_reportante ?? null;
    const prioridad = query.prioridad ?? null;

    const ids = await this.prisma.$queryRaw<Array<{ id_incidencia: string }>>(
      Prisma.sql`
        SELECT i."id_incidencia"
        FROM "INCIDENCIAS" i
        LEFT JOIN LATERAL (
          SELECT h."id_estado"
          FROM "HISTORIAL_ESTADOS" h
          WHERE h."id_incidencia" = i."id_incidencia"
          ORDER BY h."fecha_creacion" DESC, h."id_historial" DESC
          LIMIT 1
        ) estado_actual ON TRUE
        LEFT JOIN LATERAL (
          SELECT o."id_tecnico"
          FROM "ORDENES_TRABAJO" o
          WHERE o."id_incidencia" = i."id_incidencia"
          ORDER BY o."fecha_creacion" DESC, o."id_orden" DESC
          LIMIT 1
        ) orden_actual ON TRUE
        WHERE (${idActivo}::uuid IS NULL OR i."id_activo" = ${idActivo}::uuid)
          AND (${idEstado}::integer IS NULL OR estado_actual."id_estado" = ${idEstado}::integer)
          AND (${idTecnico}::uuid IS NULL OR orden_actual."id_tecnico" = ${idTecnico}::uuid)
          AND (${idReportante}::uuid IS NULL OR i."id_reportante" = ${idReportante}::uuid)
          AND (${prioridad}::text IS NULL OR i."prioridad"::text = ${prioridad}::text)
        ORDER BY i."fecha_creacion" DESC
        LIMIT ${limite} OFFSET ${offset}
      `,
    );
    if (ids.length === 0) return [];

    const [incidencias, activosPorId, usuariosPorId] = await Promise.all([
      this.prisma.incidencias.findMany({
        where: { id_incidencia: { in: ids.map((row) => row.id_incidencia) } },
        ...incidenciaConEstadoActual,
      }),
      this.resolverActivos(authHeader),
      this.resolverUsuarios(authHeader),
    ]);

    const porId = new Map(
      incidencias.map((incidencia) => [incidencia.id_incidencia, incidencia]),
    );

    return ids.flatMap((row) => {
      const incidencia = porId.get(row.id_incidencia);
      return incidencia
        ? [this.toApiIncidencia(incidencia, { activosPorId, usuariosPorId })]
        : [];
    });
  }

  /**
   * TAL-201: Obtiene los contadores globales reales de toda la tabla INCIDENCIAS
   * para el Dashboard operativo (sin truncar por la paginación inicial limit=15).
   */
  async obtenerResumenMetricas() {
    const incidencias = await this.prisma.incidencias.findMany({
      ...incidenciaConEstadoActual,
      orderBy: { fecha_creacion: 'desc' },
    });

    let pendientes = 0;
    let reportadas = 0;
    let asignadas = 0;
    let criticas = 0;
    let resueltas = 0;
    let cerradas = 0;
    let sinAsignar = 0;

    for (const inc of incidencias) {
      const estadoNombre = (
        inc.historial_estados?.[0]?.estado?.nombre_estado ?? 'Reportada'
      )
        .trim()
        .toLowerCase();

      const esCerradaOResuelta = [
        'resuelta',
        'completada',
        'cerrada',
        'rechazada',
      ].includes(estadoNombre);

      if (esCerradaOResuelta) {
        if (estadoNombre === 'resuelta' || estadoNombre === 'completada') {
          resueltas += 1;
        } else if (estadoNombre === 'cerrada') {
          cerradas += 1;
        }
        continue;
      }

      pendientes += 1;
      if (estadoNombre === 'asignada' || estadoNombre === 'en progreso') {
        asignadas += 1;
      } else {
        reportadas += 1;
      }

      if (!inc.ordenes_trabajo?.length) {
        sinAsignar += 1;
      }

      const calculo =
        this.prioridadDinamicaService.calcularPrioridadRelativa(inc);
      const prioStr = (calculo.prioridad_relativa ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (prioStr === 'critica' || prioStr === 'alta') {
        criticas += 1;
      }
    }

    return {
      total: incidencias.length,
      pendientes,
      reportadas,
      asignadas,
      criticas,
      resueltas,
      cerradas,
      sin_asignar: sinAsignar,
    };
  }

  async crear(
    body: CrearIncidenciaDto,
    usuarioId: string,
    emailUsuario?: string,
  ) {
    const prioridadAsignada =
      body.prioridad ?? PrioridadIncidencia.media;

    const creada = await this.prisma.$transaction(async (transaction) => {
      const estadoInicial = await transaction.estadoIncidencia.findFirst({
        where: { nombre_estado: 'Reportada' },
      });

      if (!estadoInicial) {
        throw new InternalServerErrorException('No está configurado el estado inicial');
      }

      const incidencia = await transaction.incidencias.create({
        data: {
          id_activo: body.id_activo,
          id_reportante: usuarioId,
          titulo: body.titulo.trim(),
          descripcion: body.descripcion.trim(),
          prioridad: prioridadAsignada,
        },
      });

      await transaction.historialEstados.create({
        data: {
          id_incidencia: incidencia.id_incidencia,
          id_estado: estadoInicial.id_estado,
          id_usuario_cambio: usuarioId,
        },
      });

      const creadaRecord = await transaction.incidencias.findUnique({
        where: { id_incidencia: incidencia.id_incidencia },
        ...incidenciaConEstadoActual,
      });

      if (!creadaRecord) throw new InternalServerErrorException();
      return this.toApiIncidencia(creadaRecord);
    });

    await this.notificarIncidencia(
      emailUsuario,
      `Nueva Incidencia Reportada: ${creada.titulo}`,
      `La incidencia "${creada.titulo}" fue reportada correctamente.`,
    );

    if (this.incidenciasGateway) {
      const idEdificio = await this.obtenerEdificioDeActivo(creada.id_activo);
      this.incidenciasGateway.emitirNuevaIncidencia(
        {
          ...creada,
          id_incidencia: creada.id_incidencia,
          id: creada.id_incidencia,
          id_edificio: idEdificio,
          timestamp: new Date().toISOString(),
        },
        idEdificio,
      );
    }

    if (this.esIncidenciaCritica(prioridadAsignada) && this.rabbitmqProducer) {
      this.rabbitmqProducer
        .emitirIncidenciaCritica({
          evento: 'INCIDENCIA_CRITICA_REGISTRADA',
          id_incidencia: creada.id_incidencia,
          id_activo: creada.id_activo,
          id_reportante: usuarioId,
          ...(emailUsuario ? { email: emailUsuario } : {}),
          titulo: creada.titulo,
          descripcion: creada.descripcion,
          prioridad: prioridadAsignada,
          fecha_creacion: creada.fecha_creacion,
          estado: creada.estado?.nombre_estado || 'Reportada',
        })
        .catch((err) => {
          this.logger.error(`[RABBITMQ] Error no controlado al emitir evento: ${err}`);
        });
    }

    return creada;
  }

  async obtener(id: string, authHeader?: string) {
    const incidencia = await this.prisma.incidencias.findUnique({
      where: { id_incidencia: id },
      ...incidenciaConEstadoActual,
    });
    if (!incidencia) throw new NotFoundException('Incidencia no encontrada');

    const [activosPorId, usuariosPorId] = await Promise.all([
      this.resolverActivos(authHeader),
      this.resolverUsuarios(authHeader),
    ]);

    if (!activosPorId.has(incidencia.id_activo)) {
      await this.resolverActivoPuntual(incidencia.id_activo, activosPorId, authHeader);
    }

    return this.toApiIncidencia(incidencia, { activosPorId, usuariosPorId });
  }

  async actualizarEstado(
    incidenciaId: string,
    idEstadoNuevo: number,
    usuarioId: string,
    rolUsuario: string,
    emailUsuario?: string,
    authHeader?: string,
  ) {
    if (!idEstadoNuevo || typeof idEstadoNuevo !== 'number') {
      throw new BadRequestException('El ID del estado es obligatorio y debe ser numérico');
    }

    if (!usuarioId) {
      throw new BadRequestException('El usuario es obligatorio');
    }

    const resultado = await this.prisma.$transaction(async (transaction) => {
      const incidencia = await transaction.incidencias.findUnique({
        where: { id_incidencia: incidenciaId },
        ...incidenciaConEstadoActual,
      });

      if (!incidencia) {
        throw new NotFoundException('Incidencia no encontrada');
      }

      const estado = await transaction.estadoIncidencia.findUnique({
        where: { id_estado: idEstadoNuevo },
      });

      if (!estado) {
        throw new NotFoundException('Estado de incidencia no encontrado');
      }

      const idEstadoActual = incidencia.historial_estados?.[0]?.estado?.id_estado;
      const nombreEstadoActual = (
        incidencia.historial_estados?.[0]?.estado?.nombre_estado ?? 'Reportada'
      )
        .trim()
        .toLowerCase();
      const nombreEstadoNuevo = estado.nombre_estado.trim().toLowerCase();
      const rolUpper = this.normalizarRol(rolUsuario);

      // 1. Bloquear estados terminales (Resuelta y Rechazada no admiten reapertura ni transiciones posteriores)
      if (idEstadoActual === 3 || nombreEstadoActual === 'resuelta' || nombreEstadoActual === 'cerrada' || nombreEstadoActual === 'completada') {
        throw new BadRequestException(
          'La funcionalidad de aprobación, reapertura o rechazo de resolución fue retirada. La incidencia ya se encuentra resuelta.',
        );
      }
      if (idEstadoActual === 5 || nombreEstadoActual === 'rechazada') {
        throw new BadRequestException(
          'Transición no permitida: la incidencia ya se encuentra en estado terminal Rechazada.',
        );
      }

      // 2. Bloquear estados históricos retirados (4: Cerrada, 6: Completada)
      if (
        idEstadoNuevo === 4 ||
        idEstadoNuevo === 6 ||
        nombreEstadoNuevo === 'cerrada' ||
        nombreEstadoNuevo === 'completada'
      ) {
        throw new BadRequestException(
          'Estado retirado (funcionalidad retirada): el ciclo oficial admite únicamente Reportada, Asignada, Resuelta y Rechazada.',
        );
      }

      if (idEstadoActual === idEstadoNuevo) {
        throw new BadRequestException('La incidencia ya se encuentra actualmente en ese estado.');
      }

      if (rolUpper === 'TECNICO') {
        await this.verificarOwnershipTecnico(incidenciaId, usuarioId, transaction);
      }

      // 3. Máquina de estados estricta de 4 estados: Reportada (1) -> Asignada (2) -> Resuelta (3) | Rechazada (5)
      if (idEstadoActual === 1 || nombreEstadoActual === 'reportada') {
        if (idEstadoNuevo === 3 || nombreEstadoNuevo === 'resuelta') {
          throw new BadRequestException(
            'Transición no válida: no se puede pasar directamente de Reportada a Resuelta sin haber sido Asignada previamente.',
          );
        }
        if (idEstadoNuevo === 2 && rolUpper !== 'SUPERVISOR' && rolUpper !== 'ADMINISTRADOR') {
          throw new ForbiddenException('Solo un SUPERVISOR puede pasar de Reportada a Asignada');
        }
        if (idEstadoNuevo === 5 && !['SUPERVISOR', 'ADMINISTRADOR', 'TECNICO'].includes(rolUpper)) {
          throw new ForbiddenException('No cuenta con permisos para rechazar una incidencia');
        }
      } else if (idEstadoActual === 2 || nombreEstadoActual === 'asignada') {
        if (idEstadoNuevo === 1 || nombreEstadoNuevo === 'reportada') {
          throw new BadRequestException(
            'Transición no válida: no se puede retroceder una incidencia Asignada nuevamente a Reportada.',
          );
        }
        if (idEstadoNuevo === 3 && rolUpper !== 'TECNICO' && rolUpper !== 'ADMINISTRADOR' && rolUpper !== 'SUPERVISOR') {
          throw new ForbiddenException('Solo un TECNICO autorizado puede pasar de Asignada a Resuelta');
        }
        if (idEstadoNuevo === 5 && !['TECNICO', 'SUPERVISOR', 'ADMINISTRADOR'].includes(rolUpper)) {
          throw new ForbiddenException('Solo personal técnico o de supervisión puede rechazar una incidencia asignada');
        }
      }

      await transaction.historialEstados.create({
        data: {
          id_incidencia: incidencia.id_incidencia,
          id_estado: idEstadoNuevo,
          id_usuario_cambio: usuarioId,
        },
      });

      if (
        (idEstadoNuevo === 3 || idEstadoNuevo === 5) &&
        typeof (transaction.ordenTrabajo as any)?.updateMany === 'function'
      ) {
        await transaction.ordenTrabajo.updateMany({
          where: { id_incidencia: incidencia.id_incidencia, fecha_cierre: null },
          data: { fecha_cierre: new Date() },
        });
      }

      const incidenciaActualizada = await transaction.incidencias.findUnique({
        where: { id_incidencia: incidenciaId },
        ...incidenciaConEstadoActual,
      });

      if (!incidenciaActualizada) throw new InternalServerErrorException();
      return {
        incidencia: this.toApiIncidencia(incidenciaActualizada),
        notificar:
          estado.nombre_estado.trim().toLowerCase() === 'resuelta' &&
          incidencia.historial_estados[0]?.estado?.nombre_estado
            .trim()
            .toLowerCase() !== 'resuelta',
      };
    });

    if (resultado.notificar) {
      await this.notificarIncidencia(
        emailUsuario,
        `Incidencia Resuelta: ${resultado.incidencia.titulo}`,
        `La incidencia "${resultado.incidencia.titulo}" fue resuelta.`,
      );
    }

    // Emisión en tiempo real vía WebSocket y Broker RabbitMQ (TAL-185 / TAL-11)
    const idEdificio = await this.obtenerEdificioDeActivo(
      resultado.incidencia.id_activo,
    );
    const nuevoEstado =
      resultado.incidencia.estado?.nombre_estado || 'DESCONOCIDO';

    const payloadWs: IncidenciaActualizadaPayload = {
      id_incidencia: incidenciaId,
      titulo: resultado.incidencia.titulo,
      id_activo: resultado.incidencia.id_activo,
      nuevo_estado: nuevoEstado,
      prioridad: resultado.incidencia.prioridad,
      usuario_responsable: usuarioId,
      id_edificio: idEdificio,
      timestamp: new Date().toISOString(),
      tipo_evento: 'CAMBIO_ESTADO',
    };

    if (this.incidenciasGateway) {
      this.incidenciasGateway.emitirIncidenciaActualizada(payloadWs, idEdificio);
    }

    if (this.rabbitmqProducer) {
      const esResolutivo = [
        'resuelta',
        'resuelto',
        'cerrada',
        'cerrado',
        'finalizada',
        'finalizado',
      ].includes(nuevoEstado.trim().toLowerCase());

      const emailReportante = esResolutivo
        ? await this.obtenerEmailReportante(
            resultado.incidencia.id_reportante,
            emailUsuario,
            authHeader,
          )
        : undefined;

      this.rabbitmqProducer
        .emitirIncidenciaActualizada({
          evento: 'INCIDENCIA_ACTUALIZADA',
          ...payloadWs,
          titulo: resultado.incidencia.titulo,
          ...(emailReportante
            ? { emailReportante, email: emailReportante }
            : {}),
          ...(resultado.incidencia.diagnostico_tecnico
            ? {
                diagnostico_tecnico: resultado.incidencia.diagnostico_tecnico,
                resolucion: resultado.incidencia.diagnostico_tecnico,
              }
            : {}),
        })
        .catch((err) => {
          this.logger.error(
            `[RABBITMQ] Error no controlado al emitir actualización: ${err}`,
          );
        });
    }

    return resultado.incidencia;
  }

  async listarHistorial(id: string) {
    await this.assertIncidenciaExists(id);
    const historial = await this.prisma.historialEstados.findMany({
      where: { id_incidencia: id },
      include: { estado: { select: { id_estado: true, nombre_estado: true } } },
      orderBy: [{ fecha_creacion: 'asc' }, { id_historial: 'asc' }],
    });
    return historial.map((evento) => ({
      id_historial: evento.id_historial,
      id_incidencia: evento.id_incidencia,
      estado: evento.estado,
      id_usuario_cambio: evento.id_usuario_cambio,
      fecha_creacion: evento.fecha_creacion,
    }));
  }

  async listarEvidencias(id: string) {
    await this.assertIncidenciaExists(id);
    const evidencias = await this.prisma.evidencia.findMany({
      where: { id_incidencia: id },
      include: { tipo_evidencia: { select: { id_tipo_evidencia: true, nombre_tipo: true } } },
      orderBy: [{ fecha_creacion: 'asc' }, { id_evidencia: 'asc' }],
    });
    return evidencias.map((evidencia) => this.toApiEvidencia(evidencia));
  }

  async crearEvidencia(id: string, body?: CrearEvidenciaDto, file?: any) {
    await this.assertIncidenciaExists(id);

    // Contrato OpenAPI: admite como máximo 5 evidencias y responde 409 al superar el límite
    if (typeof this.prisma.evidencia?.count === 'function') {
      const totalEvidencias = await this.prisma.evidencia.count({
        where: { id_incidencia: id },
      });
      if (totalEvidencias >= 5) {
        throw new ConflictException('La incidencia ya tiene el máximo de 5 evidencias permitidas.');
      }
    }

    if (!file && (!body || !body.url_evidencia || !body.url_evidencia.trim())) {
      throw new BadRequestException('Debe proporcionar un archivo de imagen o una url_evidencia válida.');
    }

    const idTipo = Number(body?.id_tipo_evidencia || 1);
    const tipo = await this.prisma.tipoEvidencia.findUnique({
      where: { id_tipo_evidencia: idTipo },
    });
    if (!tipo) throw new BadRequestException('id_tipo_evidencia no válido');

    let urlCloudinary = '';
    if (file) {
      urlCloudinary = await this.cloudinaryService.subirImagen(file);
    } else if (body?.url_evidencia) {
      const url = body.url_evidencia.trim();
      if (!this.cloudinaryService.validarUrlEvidencia(url)) {
        throw new BadRequestException('url_evidencia debe ser una dirección HTTPS válida');
      }
      urlCloudinary = url;
    }

    const evidencia = await this.prisma.evidencia.create({
      data: {
        id_incidencia: id,
        id_tipo_evidencia: tipo.id_tipo_evidencia,
        url_cloudinary: urlCloudinary,
      },
      include: { tipo_evidencia: { select: { id_tipo_evidencia: true, nombre_tipo: true } } },
    });
    return this.toApiEvidencia(evidencia);
  }

  async procesarYGuardarEvidencia(idIncidencia: string, idTipoEvidencia: number, file: any) {
    return this.crearEvidencia(idIncidencia, { id_tipo_evidencia: idTipoEvidencia }, file);
  }

  async listarEstados() {
    return this.prisma.estadoIncidencia.findMany({
      where: { id_estado: { in: [1, 2, 3, 5] } },
      select: { id_estado: true, nombre_estado: true },
      orderBy: { id_estado: 'asc' },
    });
  }

  async listarTiposEvidencia() {
    return this.prisma.tipoEvidencia.findMany({
      select: { id_tipo_evidencia: true, nombre_tipo: true },
      orderBy: { id_tipo_evidencia: 'asc' },
    });
  }

  private async assertIncidenciaExists(id: string) {
    const exists = await this.prisma.incidencias.findUnique({
      where: { id_incidencia: id },
      select: { id_incidencia: true },
    });
    if (!exists) throw new NotFoundException('Incidencia no encontrada');
  }

  async resolverIncidencia(
    idIncidencia: string,
    idTecnico: string,
    rolUsuario: string,
    emailUsuario?: string,
    authHeader?: string,
  ) {
    const rolNorm = this.normalizarRol(rolUsuario);
    const esSupervisorOAdmin = ['SUPERVISOR', 'ADMINISTRADOR'].includes(rolNorm);

    if (!['TECNICO', 'SUPERVISOR', 'ADMINISTRADOR'].includes(rolNorm)) {
      throw new ForbiddenException(
        'Acceso denegado: Solo el técnico asignado, supervisores o administradores pueden resolver incidencias.',
      );
    }

    const resultado = await this.prisma.$transaction(async (transaction) => {
      if (!esSupervisorOAdmin) {
        await this.verificarOwnershipTecnico(idIncidencia, idTecnico, transaction);
      } else {
        const orden = await transaction.ordenTrabajo.findFirst({
          where: { id_incidencia: idIncidencia },
          orderBy: [{ fecha_creacion: 'desc' }, { id_orden: 'desc' }],
        });
        if (!orden) {
          throw new BadRequestException(
            'No existe una orden de trabajo para esta incidencia. Primero debes registrar el diagnóstico.',
          );
        }
      }

      const ultimoHistorial = await transaction.historialEstados.findFirst({
        where: { id_incidencia: idIncidencia },
        orderBy: [{ fecha_creacion: 'desc' }, { id_historial: 'desc' }],
        include: { estado: true },
      });

      if (!ultimoHistorial) {
        throw new BadRequestException(
          'La incidencia no tiene un historial de estados válido.',
        );
      }

      const nombreEstadoActual =
        ultimoHistorial.estado.nombre_estado.trim().toUpperCase();

      if (nombreEstadoActual !== 'ASIGNADA') {
        throw new BadRequestException(
          `Transición no válida: Solo una incidencia ASIGNADA puede pasar a RESUELTA (estado actual: ${nombreEstadoActual}).`,
        );
      }

      const estadoDestino = await transaction.estadoIncidencia.findFirst({
        where: {
          nombre_estado: {
            equals: 'Resuelta',
            mode: 'insensitive',
          },
        },
      });

      if (!estadoDestino) {
        throw new InternalServerErrorException(
          'Error de configuración: El estado "Resuelta" no existe en la base de datos.',
        );
      }

      const incidencia = await transaction.incidencias.findUnique({
        where: { id_incidencia: idIncidencia },
        select: { titulo: true, id_activo: true, id_reportante: true },
      });

      if (!incidencia) {
        throw new NotFoundException('Incidencia no encontrada');
      }

      const nuevoHistorial = await transaction.historialEstados.create({
        data: {
          id_incidencia: idIncidencia,
          id_estado: estadoDestino.id_estado,
          id_usuario_cambio: idTecnico,
        },
        include: { estado: true },
      });

      if (typeof (transaction.ordenTrabajo as any)?.updateMany === 'function') {
        await transaction.ordenTrabajo.updateMany({
          where: { id_incidencia: idIncidencia },
          data: { fecha_cierre: new Date() },
        });
      }

      return {
        historial: nuevoHistorial,
        titulo: incidencia.titulo,
        id_activo: incidencia.id_activo,
        id_reportante: incidencia.id_reportante,
      };
    });

    await this.notificarIncidencia(
      emailUsuario,
      `Incidencia Resuelta: ${resultado.titulo}`,
      `La incidencia "${resultado.titulo}" fue resuelta.`,
    );

    // Emisión en tiempo real vía WebSocket y Broker RabbitMQ (TAL-185 / TAL-11)
    const idEdificio = await this.obtenerEdificioDeActivo(resultado.id_activo);

    const payloadWs: IncidenciaActualizadaPayload = {
      id_incidencia: idIncidencia,
      titulo: resultado.titulo,
      id_activo: resultado.id_activo,
      nuevo_estado: 'RESUELTA',
      usuario_responsable: idTecnico,
      id_edificio: idEdificio,
      timestamp: new Date().toISOString(),
      tipo_evento: 'CAMBIO_ESTADO',
    };

    if (this.incidenciasGateway) {
      this.incidenciasGateway.emitirIncidenciaActualizada(payloadWs, idEdificio);
    }

    if (this.rabbitmqProducer) {
      const emailReportante = await this.obtenerEmailReportante(
        resultado.id_reportante,
        emailUsuario,
        authHeader,
      );

      this.rabbitmqProducer
        .emitirIncidenciaActualizada({
          evento: 'INCIDENCIA_ACTUALIZADA',
          ...payloadWs,
          titulo: resultado.titulo,
          ...(emailReportante
            ? { emailReportante, email: emailReportante }
            : {}),
        })
        .catch((err) => {
          this.logger.error(
            `[RABBITMQ] Error no controlado al emitir resolución: ${err}`,
          );
        });
    }

    return resultado.historial;
  }

  async clasificarPrioridad(idIncidencia: string, prioridadRaw: string) {
    const normalizada = (prioridadRaw || '').trim().toLowerCase();
    const mapPrioridad: Record<string, string> = {
      baja: 'baja',
      media: 'media',
      alta: 'alta',
      critica: 'critica',
      'crítica': 'critica',
    };

    const prioridadEnum = mapPrioridad[normalizada];
    if (!prioridadEnum) {
      throw new BadRequestException(
        'Prioridad no válida. Valores permitidos: Baja, Media, Alta, Crítica',
      );
    }

    const incidencia = await this.prisma.incidencias.findUnique({
      where: { id_incidencia: idIncidencia },
    });

    if (!incidencia) {
      throw new NotFoundException('Incidencia no encontrada');
    }

    const actualizada = await this.prisma.incidencias.update({
      where: { id_incidencia: idIncidencia },
      data: { prioridad: prioridadEnum as any },
      ...incidenciaConEstadoActual,
    });

    const apiIncidencia = this.toApiIncidencia(actualizada);

    if (this.incidenciasGateway) {
      const idEdificio = await this.obtenerEdificioDeActivo(apiIncidencia.id_activo);
      this.incidenciasGateway.emitirIncidenciaActualizada(
        {
          id_incidencia: idIncidencia,
          titulo: apiIncidencia.titulo,
          id_activo: apiIncidencia.id_activo,
          nuevo_estado: apiIncidencia.estado?.nombre_estado || 'Reportada',
          prioridad: apiIncidencia.prioridad,
          accion: 'CAMBIO_PRIORIDAD',
          tipo_cambio: 'CAMBIO_PRIORIDAD',
          cambio_prioridad: true,
          usuario_responsable: null,
          id_edificio: idEdificio,
          timestamp: new Date().toISOString(),
          tipo_evento: 'CAMBIO_ESTADO',
        },
        idEdificio,
      );
    }

    if (this.rabbitmqProducer) {
      const idEdificio = await this.obtenerEdificioDeActivo(apiIncidencia.id_activo);
      this.rabbitmqProducer
        .emitirIncidenciaActualizada({
          evento: 'INCIDENCIA_ACTUALIZADA',
          id_incidencia: idIncidencia,
          titulo: apiIncidencia.titulo,
          id_activo: apiIncidencia.id_activo,
          nuevo_estado: apiIncidencia.estado?.nombre_estado || 'Reportada',
          prioridad: apiIncidencia.prioridad,
          accion: 'CAMBIO_PRIORIDAD',
          tipo_cambio: 'CAMBIO_PRIORIDAD',
          cambio_prioridad: true,
          usuario_responsable: null,
          id_edificio: idEdificio,
          timestamp: new Date().toISOString(),
          tipo_evento: 'CAMBIO_ESTADO',
        })
        .catch((err) => {
          this.logger.error(
            `[RABBITMQ] Error no controlado al emitir cambio de prioridad: ${err}`,
          );
        });
    }

    return apiIncidencia;
  }

  /**
   * TAL-128: Endpoint de Métricas: Tiempo de Resolución Promedio (MTTR) e Indicadores de Incidencias.
   *
   * Regla de negocio acordada con el Scrum Master:
   * Tomar la fecha_creacion del registro más reciente en HISTORIAL_ESTADOS donde la incidencia
   * pasa a estado "Resuelta" (case-insensitive) como fecha de cierre para calcular el MTTR respecto
   * a la fecha_creacion de la orden de trabajo vigente (la más reciente) de esa incidencia.
   */
  async obtenerEstadisticasTiempoResolucion(authHeader?: string) {
    const incidencias = await this.prisma.incidencias.findMany({
      include: {
        historial_estados: {
          include: {
            estado: {
              select: { id_estado: true, nombre_estado: true },
            },
          },
          orderBy: [{ fecha_creacion: 'desc' }, { id_historial: 'desc' }],
        },
        ordenes_trabajo: {
          orderBy: [{ fecha_creacion: 'desc' }, { id_orden: 'desc' }],
        },
      },
      orderBy: { fecha_creacion: 'desc' },
    });

    const [activosPorId, usuariosPorId] = await Promise.all([
      this.resolverActivos(authHeader),
      this.resolverUsuarios(authHeader),
    ]);

    const conteoPorEstado: Record<string, number> = {};
    const conteoPorPrioridad: Record<string, number> = {};

    interface OrdenResueltaItem {
      id_incidencia: string;
      id_activo: string;
      id_tecnico: string | null;
      horas: number;
    }

    const ordenesResueltas: OrdenResueltaItem[] = [];

    for (const inc of incidencias) {
      // 1. Conteo por estado actual
      const estadosOrdenados = [...(inc.historial_estados ?? [])].sort(
        (a, b) =>
          new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime() ||
          String(b.id_historial ?? '').localeCompare(String(a.id_historial ?? '')),
      );
      const estadoActual =
        estadosOrdenados[0]?.estado?.nombre_estado?.trim() || 'Reportada';
      conteoPorEstado[estadoActual] = (conteoPorEstado[estadoActual] || 0) + 1;

      // 2. Conteo por prioridad
      const prioridad = inc.prioridad || 'media';
      conteoPorPrioridad[prioridad] = (conteoPorPrioridad[prioridad] || 0) + 1;

      // 3. Regla de negocio (Scrum Master TAL-128):
      // Requiere al menos una orden de trabajo y paso al estado "Resuelta" (case-insensitive)
      if (!inc.ordenes_trabajo?.length || !inc.historial_estados?.length) {
        continue;
      }

      const historialResueltas = (inc.historial_estados ?? []).filter(
        (h) => h.estado?.nombre_estado?.trim().toLowerCase() === 'resuelta',
      );

      if (historialResueltas.length === 0) {
        continue;
      }

      historialResueltas.sort(
        (a, b) =>
          new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime() ||
          String(b.id_historial ?? '').localeCompare(String(a.id_historial ?? '')),
      );
      const ultimoPasoResuelta = historialResueltas[0];

      const ordenesOrdenadas = [...(inc.ordenes_trabajo ?? [])].sort(
        (a, b) =>
          new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime() ||
          String(b.id_orden ?? '').localeCompare(String(a.id_orden ?? '')),
      );
      const ordenVigente = ordenesOrdenadas[0];

      const fechaResueltaMs = new Date(ultimoPasoResuelta.fecha_creacion).getTime();
      const fechaOrdenMs = new Date(ordenVigente.fecha_creacion).getTime();

      const diffMs = fechaResueltaMs - fechaOrdenMs;
      const horasRaw = Math.max(0, diffMs / 3600000);
      const horas = Math.round(horasRaw * 100) / 100;

      ordenesResueltas.push({
        id_incidencia: inc.id_incidencia,
        id_activo: inc.id_activo,
        id_tecnico: ordenVigente.id_tecnico ?? null,
        horas,
      });
    }

    const totalOrdenesCerradas = ordenesResueltas.length;
    let sumaHorasTotal = 0;
    for (const item of ordenesResueltas) {
      sumaHorasTotal += item.horas;
    }

    const promedioHorasTotal =
      totalOrdenesCerradas > 0
        ? Math.round((sumaHorasTotal / totalOrdenesCerradas) * 100) / 100
        : 0;

    // Desglose por Técnico
    const grupoTecnico = new Map<
      string | null,
      { total: number; sumaHoras: number }
    >();
    for (const item of ordenesResueltas) {
      const actual = grupoTecnico.get(item.id_tecnico) || {
        total: 0,
        sumaHoras: 0,
      };
      actual.total += 1;
      actual.sumaHoras += item.horas;
      grupoTecnico.set(item.id_tecnico, actual);
    }

    const desglosePorTecnico = Array.from(grupoTecnico.entries()).map(
      ([idTecnico, data]) => {
        let nombreTecnico: string | null = null;
        if (idTecnico && usuariosPorId) {
          const u = usuariosPorId.get(idTecnico);
          if (u) {
            nombreTecnico =
              [u.nombre, u.apellido].filter(Boolean).join(' ').trim() ||
              u.email ||
              null;
          }
        }
        return {
          id_tecnico: idTecnico,
          nombre_tecnico: nombreTecnico,
          totalOrdenesCerradas: data.total,
          promedioHoras:
            data.total > 0
              ? Math.round((data.sumaHoras / data.total) * 100) / 100
              : 0,
        };
      },
    );

    // Desglose por Activo
    const grupoActivo = new Map<
      string,
      { total: number; sumaHoras: number }
    >();
    for (const item of ordenesResueltas) {
      const actual = grupoActivo.get(item.id_activo) || {
        total: 0,
        sumaHoras: 0,
      };
      actual.total += 1;
      actual.sumaHoras += item.horas;
      grupoActivo.set(item.id_activo, actual);
    }

    const desglosePorActivo = Array.from(grupoActivo.entries()).map(
      ([idActivo, data]) => {
        const nombreActivo = activosPorId?.get(idActivo)?.nombre ?? null;
        return {
          id_activo: idActivo,
          nombre_activo: nombreActivo,
          totalOrdenesCerradas: data.total,
          promedioHoras:
            data.total > 0
              ? Math.round((data.sumaHoras / data.total) * 100) / 100
              : 0,
        };
      },
    );

    return {
      promedioHorasTotal,
      totalOrdenesCerradas,
      desglosePorTecnico,
      desglosePorActivo,
      conteoPorEstado,
      conteoPorPrioridad,
    };
  }

  private async notificarIncidencia(
    email: string | undefined,
    asunto: string,
    cuerpoMensaje: string,
  ): Promise<void> {
    if (!email) {
      this.logger.warn(
        'No se envió la notificación porque el token no contiene el correo del usuario.',
      );
      return;
    }

    try {
      await firstValueFrom(
        this.httpService.post(this.notificacionesUrl, {
          email,
          asunto,
          cuerpoMensaje,
        }),
      );
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error al notificar al usuario ${email}: ${detalle}`);
    }
  }

  private normalizarRol(rol: string): string {
    return rol
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  }

  private toApiIncidencia(
    incidencia: IncidenciaConEstadoActual,
    resolutores?: {
      activosPorId?: Map<string, { nombre: string; codigoQr?: string }>;
      usuariosPorId?: Map<
        string,
        { nombre: string; apellido?: string; email?: string }
      >;
    },
  ) {
    const estado = incidencia.historial_estados?.[0]?.estado;
    const calculo =
      this.prioridadDinamicaService.calcularPrioridadRelativa(incidencia);
    const ordenActiva = incidencia.ordenes_trabajo?.[0] ?? null;
    const idTecnico = ordenActiva?.id_tecnico ?? null;

    const formatearUsuario = (idUsuario?: string | null): string | null => {
      if (!idUsuario) return null;
      const u = resolutores?.usuariosPorId?.get(idUsuario);
      if (!u) return null;
      return `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.email || null;
    };

    const nombreTecnico = formatearUsuario(idTecnico);
    const nombreReportante = formatearUsuario(incidencia.id_reportante);
    const infoActivo = resolutores?.activosPorId?.get(incidencia.id_activo);

    const historialAsignaciones = (incidencia.ordenes_trabajo ?? []).map((ot, index) => ({
      id_orden: ot.id_orden,
      id_tecnico: ot.id_tecnico,
      nombre_tecnico: formatearUsuario(ot.id_tecnico),
      diagnostico_tecnico: ot.diagnostico_tecnico ?? null,
      fecha_creacion: ot.fecha_creacion,
      vigente: index === 0,
    }));

    return {
      id_incidencia: incidencia.id_incidencia,
      id_activo: incidencia.id_activo,
      nombre_activo: infoActivo?.nombre ?? null,
      codigo_qr_activo: infoActivo?.codigoQr ?? null,
      id_reportante: incidencia.id_reportante,
      nombre_reportante: nombreReportante,
      id_orden: ordenActiva?.id_orden ?? null,
      id_tecnico: idTecnico,
      id_tecnico_asignado: idTecnico,
      nombre_tecnico: nombreTecnico,
      tecnico_asignado: nombreTecnico ?? idTecnico ?? null,
      fecha_asignacion: ordenActiva?.fecha_creacion ?? null,
      diagnostico_tecnico: ordenActiva?.diagnostico_tecnico ?? null,
      orden_trabajo: ordenActiva
        ? {
            id_orden: ordenActiva.id_orden,
            id_incidencia: ordenActiva.id_incidencia,
            id_tecnico: ordenActiva.id_tecnico,
            nombre_tecnico: nombreTecnico,
            diagnostico_tecnico: ordenActiva.diagnostico_tecnico ?? null,
            fecha_creacion: ordenActiva.fecha_creacion,
          }
        : null,
      historial_asignaciones: historialAsignaciones,
      titulo: incidencia.titulo,
      descripcion: incidencia.descripcion,
      estado: estado || null,
      evidencias: incidencia.evidencias?.map((e) => this.toApiEvidencia(e as any)) || [],
      fecha_creacion: incidencia.fecha_creacion,
      prioridad: incidencia.prioridad ?? calculo.prioridad_relativa,
      prioridad_original: incidencia.prioridad ?? calculo.prioridad_original,
      prioridad_relativa: calculo.prioridad_relativa,
      escalada: calculo.escalada,
      tiempo_inactividad_horas: calculo.tiempo_inactividad_horas,
      antiguedad_dias: calculo.antiguedad_dias,
      motivo_escalamiento: calculo.motivo_escalamiento,
    };
  }

  async obtenerReportePrioridades(query?: PrioridadDinamicaQueryDto) {
    const incidencias = await this.prisma.incidencias.findMany({
      ...incidenciaConEstadoActual,
      orderBy: { fecha_creacion: 'asc' },
    });

    return this.prioridadDinamicaService.generarReporte(incidencias, query);
  }

  async obtenerPrioridadDinamica(id: string, query?: PrioridadDinamicaQueryDto) {
    const incidencia = await this.prisma.incidencias.findUnique({
      where: { id_incidencia: id },
      ...incidenciaConEstadoActual,
    });

    if (!incidencia) throw new NotFoundException('Incidencia no encontrada');

    const calculo = this.prioridadDinamicaService.calcularPrioridadRelativa(incidencia, {
      excluirFinesDeSemana: Boolean(query?.excluir_fines_de_semana),
    });

    return {
      valido: true,
      id_incidencia: incidencia.id_incidencia,
      titulo: incidencia.titulo,
      id_activo: incidencia.id_activo,
      fecha_creacion: incidencia.fecha_creacion,
      ...calculo,
    };
  }

  async exportarIncidencias(query?: ExportarIncidenciasQueryDto) {
    const where: Prisma.IncidenciasWhereInput = {};

    if (query?.id_activo) {
      where.id_activo = query.id_activo;
    }

    if (query?.fecha_inicio || query?.fecha_fin) {
      where.fecha_creacion = {};
      if (query.fecha_inicio) {
        where.fecha_creacion.gte = new Date(query.fecha_inicio);
      }
      if (query.fecha_fin) {
        where.fecha_creacion.lte = new Date(query.fecha_fin);
      }
    }

    const incidencias = await this.prisma.incidencias.findMany({
      where,
      ...incidenciaConEstadoActual,
      orderBy: { fecha_creacion: 'desc' },
    });

    return this.exportarIncidenciasService.exportar(incidencias, query?.formato);
  }

  private toApiEvidencia(
    evidencia: Prisma.EvidenciaGetPayload<{
      include: { tipo_evidencia: true };
    }>,
  ) {
    return {
      id_evidencia: evidencia.id_evidencia,
      id_incidencia: evidencia.id_incidencia,
      id_tipo_evidencia: evidencia.id_tipo_evidencia,
      tipo: evidencia.tipo_evidencia,
      tipo_evidencia: evidencia.tipo_evidencia,
      url_evidencia: evidencia.url_cloudinary,
      url_cloudinary: evidencia.url_cloudinary,
      fecha_creacion: evidencia.fecha_creacion,
    };
  }

  private async resolverActivos(
    authHeader?: string,
  ): Promise<
    Map<string, { nombre: string; codigoQr?: string }>
  > {
    const mapa = new Map<string, { nombre: string; codigoQr?: string }>();
    try {
      if (typeof this.httpService?.get === 'function') {
        const resp = await firstValueFrom(
          this.httpService.get(`${this.activosUrl}/api/v1/activos?limit=50`, {
            timeout: 1500,
            ...(authHeader ? { headers: { Authorization: authHeader } } : {}),
          }),
        );
        const items = resp?.data?.datos || resp?.data;
        if (Array.isArray(items)) {
          for (const item of items) {
            const id = item?.id || item?.id_activo;
            if (id) {
              mapa.set(id, {
                nombre: item.nombre || 'Activo sin nombre',
                codigoQr: item.codigoQr || item.codigo_qr,
              });
              const ed =
                item.id_edificio ||
                item.idEdificio ||
                item.edificio ||
                (item.ubicacion ? this.extraerEdificio(item.ubicacion) : null);
              if (ed) {
                this.edificioPorActivoCache.set(id, String(ed));
              }
            }
          }
        }
      }
    } catch {
      // Continúa a consulta de respaldo en BD compartida si ms-activos no responde o restringe por rol
    }

    if (
      mapa.size === 0 &&
      typeof (this.prisma as any)?.$queryRaw === 'function'
    ) {
      try {
        const rows = await this.prisma.$queryRaw<
          Array<{ id: string; nombre: string; codigo_qr?: string }>
        >(Prisma.sql`SELECT "id", "nombre", "codigo_qr" FROM public."activos" LIMIT 200`);
        if (Array.isArray(rows)) {
          for (const row of rows) {
            if (row?.id) {
              mapa.set(row.id, {
                nombre: row.nombre || 'Activo sin nombre',
                codigoQr: row.codigo_qr,
              });
            }
          }
        }
      } catch {
        // Fallback silencioso si la tabla activos reside en instancia separada
      }
    }

    return mapa;
  }

  private async resolverActivoPuntual(
    idActivo: string,
    mapa: Map<string, { nombre: string; codigoQr?: string }>,
    authHeader?: string,
  ): Promise<void> {
    if (!idActivo) return;
    try {
      if (typeof this.httpService?.get === 'function') {
        const resp = await firstValueFrom(
          this.httpService.get(
            `${this.activosUrl}/activos/validar-qr?codigoQr=${encodeURIComponent(idActivo)}`,
            {
              timeout: 1500,
              ...(authHeader ? { headers: { Authorization: authHeader } } : {}),
            },
          ),
        );
        const activo = resp?.data?.activo;
        if (activo) {
          mapa.set(idActivo, {
            nombre: activo.nombre || 'Activo sin nombre',
            codigoQr: activo.codigoQr || activo.codigo_qr,
          });
          const ed =
            activo.id_edificio ||
            activo.idEdificio ||
            activo.edificio ||
            (activo.ubicacion ? this.extraerEdificio(activo.ubicacion) : null);
          if (ed) {
            this.edificioPorActivoCache.set(idActivo, String(ed));
          }
        }
      }
    } catch {
      // Ignorar fallback silencioso
    }
  }

  private async resolverUsuarios(
    authHeader?: string,
  ): Promise<
    Map<string, { nombre: string; apellido?: string; email?: string }>
  > {
    const mapa = new Map<
      string,
      { nombre: string; apellido?: string; email?: string }
    >();
    try {
      if (typeof this.httpService?.get === 'function') {
        const resp = await firstValueFrom(
          this.httpService.get(`${this.authUrl}/auth/usuarios?limit=50`, {
            timeout: 1500,
            ...(authHeader ? { headers: { Authorization: authHeader } } : {}),
          }),
        );
        const items = resp?.data?.datos || resp?.data;
        if (Array.isArray(items)) {
          for (const item of items) {
            const id = item?.id_usuario || item?.id || item?.userId;
            if (id) {
              mapa.set(id, {
                nombre: item.nombre || 'Usuario',
                apellido: item.apellido,
                email: item.email || item.correo,
              });
            }
          }
        }
      }
    } catch {
      // Continúa a consulta de respaldo en BD compartida si ms-auth no responde o restringe por rol
    }

    if (
      mapa.size === 0 &&
      typeof (this.prisma as any)?.$queryRaw === 'function'
    ) {
      try {
        const rows = await this.prisma.$queryRaw<
          Array<{
            id_usuario: string;
            nombre: string;
            apellido?: string;
            email?: string;
          }>
        >(
          Prisma.sql`SELECT "id_usuario", "nombre", "apellido", "email" FROM public."USUARIOS" LIMIT 200`,
        );
        if (Array.isArray(rows)) {
          for (const row of rows) {
            if (row?.id_usuario) {
              mapa.set(row.id_usuario, {
                nombre: row.nombre || 'Usuario',
                apellido: row.apellido,
                email: row.email,
              });
            }
          }
        }
      } catch {
        // Fallback silencioso si la tabla USUARIOS reside en instancia separada
      }
    }

    return mapa;
  }
}