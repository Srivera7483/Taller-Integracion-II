import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { CrearEvidenciaDto } from './dto/crear-evidencia.dto';
import type { CrearIncidenciaDto } from './dto/crear-incidencia.dto';
import type { ListarIncidenciasQueryDto } from './dto/listar-incidencias-query.dto';
import type { ActualizarEstadoDto } from './dto/actualizar-estado.dto';

const incidenciaConEstadoActual = {
  include: {
    historial: {
      orderBy: [{ fecha_creacion: 'desc' }, { id_historial: 'desc' }],
      take: 1,
      include: { estado: { select: { id_estado: true, nombre_estado: true } } },
    },
  },
} satisfies Prisma.IncidenciasDefaultArgs;

type IncidenciaConEstadoActual = Prisma.IncidenciasGetPayload<
  typeof incidenciaConEstadoActual
>;

@Injectable()
export class IncidenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(query: ListarIncidenciasQueryDto) {
    const limite = query.limite ?? 20;
    const idActivo = query.id_activo ?? null;
    const idEstado = query.id_estado ?? null;
    const ids = await this.prisma.$queryRaw<Array<{ id_incidencia: string }>>(
      Prisma.sql`
        SELECT i."id_incidencia"
        FROM "Incidencias" i
        LEFT JOIN LATERAL (
          SELECT h."id_estado"
          FROM "HistorialIncidencia" h
          WHERE h."id_incidencia" = i."id_incidencia"
          ORDER BY h."fecha_creacion" DESC, h."id_historial" DESC
          LIMIT 1
        ) estado_actual ON TRUE
        WHERE (${idActivo}::text IS NULL OR i."id_activo" = ${idActivo})
          AND (${idEstado}::integer IS NULL OR estado_actual."id_estado" = ${idEstado})
        ORDER BY i."created_at" DESC
        LIMIT ${limite}
      `,
    );
    if (ids.length === 0) return [];

    const incidencias = await this.prisma.incidencias.findMany({
      where: { id_incidencia: { in: ids.map((row) => row.id_incidencia) } },
      ...incidenciaConEstadoActual,
    });
    const porId = new Map(
      incidencias.map((incidencia) => [incidencia.id_incidencia, incidencia]),
    );
    return ids.flatMap((row) => {
      const incidencia = porId.get(row.id_incidencia);
      return incidencia ? [this.toApiIncidencia(incidencia)] : [];
    });
  }

  async crear(body: CrearIncidenciaDto, usuario: AuthenticatedUser) {
    return this.prisma.$transaction(async (transaction) => {
      const estadoInicial = await transaction.estadoIncidencia.findUnique({
        where: { nombre_estado: 'Reportada' },
      });
      if (!estadoInicial) {
        throw new InternalServerErrorException('No está configurado el estado inicial');
      }

      const incidencia = await transaction.incidencias.create({
        data: {
          id_activo: body.id_activo,
          id_reportante: usuario.id,
          titulo: body.titulo.trim(),
          descripcion: body.descripcion.trim(),
        },
      });
      await transaction.historialIncidencia.create({
        data: {
          id_incidencia: incidencia.id_incidencia,
          id_estado: estadoInicial.id_estado,
          id_usuario_cambio: usuario.id,
        },
      });
      const creada = await transaction.incidencias.findUnique({
        where: { id_incidencia: incidencia.id_incidencia },
        ...incidenciaConEstadoActual,
      });
      if (!creada) throw new InternalServerErrorException();
      return this.toApiIncidencia(creada);
    });
  }

  async obtener(id: string) {
    const incidencia = await this.prisma.incidencias.findUnique({
      where: { id_incidencia: id },
      ...incidenciaConEstadoActual,
    });
    if (!incidencia) throw new NotFoundException('Incidencia no encontrada');
    return this.toApiIncidencia(incidencia);
  }

  async actualizarEstado(
    id: string,
    body: ActualizarEstadoDto,
    usuario: AuthenticatedUser,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const incidencia = await transaction.incidencias.findUnique({
        where: { id_incidencia: id },
        ...incidenciaConEstadoActual,
      });
      if (!incidencia) throw new NotFoundException('Incidencia no encontrada');

      const estadoNuevo = await transaction.estadoIncidencia.findUnique({
        where: { id_estado: body.id_estado },
      });
      if (!estadoNuevo) throw new BadRequestException('id_estado no válido');

      const estadoActual = incidencia.historial[0]?.estado;
      if (!estadoActual) {
        throw new InternalServerErrorException('La incidencia no tiene estado inicial');
      }
      if (estadoActual.id_estado === estadoNuevo.id_estado) {
        return this.toApiIncidencia(incidencia);
      }

      const rolPermitido =
        estadoActual.nombre_estado === 'Reportada' && estadoNuevo.nombre_estado === 'Asignada'
          ? 'SUPERVISOR'
          : estadoActual.nombre_estado === 'Asignada' && estadoNuevo.nombre_estado === 'Resuelta'
            ? 'TECNICO'
            : undefined;
      if (!rolPermitido) {
        throw new BadRequestException('Transición de estado no permitida');
      }
      if (usuario.role !== rolPermitido) {
        throw new ForbiddenException('El rol no puede realizar esta transición');
      }

      await transaction.historialIncidencia.create({
        data: {
          id_incidencia: id,
          id_estado: estadoNuevo.id_estado,
          id_usuario_cambio: usuario.id,
        },
      });
      const actualizada = await transaction.incidencias.findUnique({
        where: { id_incidencia: id },
        ...incidenciaConEstadoActual,
      });
      if (!actualizada) throw new InternalServerErrorException();
      return this.toApiIncidencia(actualizada);
    });
  }

  async listarHistorial(id: string) {
    await this.assertIncidenciaExists(id);
    const historial = await this.prisma.historialIncidencia.findMany({
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
      include: { tipo: { select: { id_tipo_evidencia: true, nombre_tipo: true } } },
      orderBy: [{ fecha_creacion: 'asc' }, { id_evidencia: 'asc' }],
    });
    return evidencias.map((evidencia) => this.toApiEvidencia(evidencia));
  }

  async crearEvidencia(id: string, body: CrearEvidenciaDto) {
    await this.assertIncidenciaExists(id);
    const tipo = await this.prisma.tipoEvidencia.findUnique({
      where: { id_tipo_evidencia: body.id_tipo_evidencia },
    });
    if (!tipo) throw new BadRequestException('id_tipo_evidencia no válido');

    const evidencia = await this.prisma.evidencia.create({
      data: {
        id_incidencia: id,
        id_tipo_evidencia: tipo.id_tipo_evidencia,
        url_evidencia: body.url_evidencia.trim(),
      },
      include: { tipo: { select: { id_tipo_evidencia: true, nombre_tipo: true } } },
    });
    return this.toApiEvidencia(evidencia);
  }

  async listarEstados() {
    return this.prisma.estadoIncidencia.findMany({
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

  private toApiIncidencia(incidencia: IncidenciaConEstadoActual) {
    const estado = incidencia.historial[0]?.estado;
    if (!estado) {
      throw new InternalServerErrorException('La incidencia no tiene estado inicial');
    }
    return {
      id_incidencia: incidencia.id_incidencia,
      id_activo: incidencia.id_activo,
      id_reportante: incidencia.id_reportante,
      titulo: incidencia.titulo,
      descripcion: incidencia.descripcion,
      estado,
      fecha_creacion: incidencia.fecha_creacion,
    };
  }

  private toApiEvidencia(evidencia: {
    id_evidencia: string;
    id_incidencia: string;
    url_evidencia: string;
    fecha_creacion: Date;
    tipo: { id_tipo_evidencia: number; nombre_tipo: string };
  }) {
    return {
      id_evidencia: evidencia.id_evidencia,
      id_incidencia: evidencia.id_incidencia,
      tipo: evidencia.tipo,
      url_evidencia: evidencia.url_evidencia,
      fecha_creacion: evidencia.fecha_creacion,
    };
  }
}