import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CrearEvidenciaDto } from './dto/crear-evidencia.dto';
import type { CrearIncidenciaDto } from './dto/crear-incidencia.dto';
import type { ListarIncidenciasQueryDto } from './dto/listar-incidencias-query.dto';
// @ts-ignore
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

const incidenciaConEstadoActual = {
  include: {
    historial_estados: {
      orderBy: [{ fecha_creacion: 'desc' as const }, { id_historial: 'desc' as const }],
      take: 1,
      include: { estado: { select: { id_estado: true, nombre_estado: true } } },
    },
    evidencias: {
      select: { url_cloudinary: true }
    }
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
        FROM "INCIDENCIAS" i
        LEFT JOIN LATERAL (
          SELECT h."id_estado"
          FROM "HISTORIAL_ESTADOS" h
          WHERE h."id_incidencia" = i."id_incidencia"
          ORDER BY h."fecha_creacion" DESC, h."id_historial" DESC
          LIMIT 1
        ) estado_actual ON TRUE
        WHERE (${idActivo}::uuid IS NULL OR i."id_activo" = ${idActivo}::uuid)
          AND (${idEstado}::integer IS NULL OR estado_actual."id_estado" = ${idEstado}::integer)
        ORDER BY i."fecha_creacion" DESC
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

  async crear(body: CrearIncidenciaDto, usuarioId: string) {
    return this.prisma.$transaction(async (transaction) => {
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
        },
      });

      await transaction.historialEstados.create({
        data: {
          id_incidencia: incidencia.id_incidencia,
          id_estado: estadoInicial.id_estado,
          id_usuario_cambio: usuarioId,
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
    incidenciaId: string,
    idEstadoNuevo: number,
    usuarioId: string,
    rolUsuario: string,
  ) {
    if (!idEstadoNuevo || typeof idEstadoNuevo !== 'number') {
      throw new BadRequestException('El ID del estado es obligatorio y debe ser numérico');
    }

    if (!usuarioId) {
      throw new BadRequestException('El usuario es obligatorio');
    }

    return this.prisma.$transaction(async (transaction) => {
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
      const rolUpper = rolUsuario.toUpperCase();

      if (idEstadoActual === 1 && idEstadoNuevo === 2 && rolUpper !== 'SUPERVISOR') {
        throw new ForbiddenException('Solo un SUPERVISOR puede pasar de Reportada a Asignada');
      }
      if (idEstadoActual === 2 && idEstadoNuevo === 3 && rolUpper !== 'TECNICO') {
        throw new ForbiddenException('Solo un TECNICO puede pasar de Asignada a Resuelta');
      }
      if (idEstadoActual === 3 && (idEstadoNuevo === 4 || idEstadoNuevo === 5) && rolUpper !== 'REPORTANTE' && rolUpper !== 'ADMINISTRADOR') {
        throw new ForbiddenException('Solo el REPORTANTE o ADMINISTRADOR puede Cerrar o Rechazar una incidencia');
      }

      await transaction.historialEstados.create({
        data: {
          id_incidencia: incidencia.id_incidencia,
          id_estado: idEstadoNuevo,
          id_usuario_cambio: usuarioId,
        },
      });

      const incidenciaActualizada = await transaction.incidencias.findUnique({
        where: { id_incidencia: incidenciaId },
        ...incidenciaConEstadoActual,
      });

      if (!incidenciaActualizada) throw new InternalServerErrorException();
      return this.toApiIncidencia(incidenciaActualizada);
    });
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
        url_cloudinary: body.url_evidencia.trim(), 
      },
      include: { tipo_evidencia: { select: { id_tipo_evidencia: true, nombre_tipo: true } } },
    });
    return this.toApiEvidencia(evidencia);
  }

  async procesarYGuardarEvidencia(idIncidencia: string, idTipoEvidencia: number, file: any) {
    await this.assertIncidenciaExists(idIncidencia);
    
    if (!idTipoEvidencia) {
      throw new BadRequestException('id_tipo_evidencia es requerido');
    }

    const tipo = await this.prisma.tipoEvidencia.findUnique({
      where: { id_tipo_evidencia: idTipoEvidencia },
    });
    if (!tipo) throw new BadRequestException('id_tipo_evidencia no válido');

    const uploadsDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    const fileId = uuidv4();
    const fileName = `${fileId}.webp`;
    const filePath = path.join(uploadsDir, fileName);

    await sharp(file.buffer)
      .resize({ width: 1080, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filePath);

    const publicUrl = `/uploads/${fileName}`;

    const evidencia = await this.prisma.evidencia.create({
      data: {
        id_incidencia: idIncidencia,
        id_tipo_evidencia: tipo.id_tipo_evidencia,
        url_cloudinary: publicUrl,
      },
      include: { tipo_evidencia: { select: { id_tipo_evidencia: true, nombre_tipo: true } } },
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


  async resolverIncidencia(idIncidencia: string, idTecnico: string, rolUsuario: string) {
      const rolUpper = rolUsuario.toUpperCase();
      if (rolUpper !== 'TÉCNICO' && rolUpper !== 'TECNICO') {
        throw new ForbiddenException('Acceso denegado: Solo los técnicos pueden resolver incidencias.');
      }

      return this.prisma.$transaction(async (transaction) => {
        
        const ultimoHistorial = await transaction.historialEstados.findFirst({
          where: { id_incidencia: idIncidencia },
          orderBy: { fecha_creacion: 'desc' },
          include: { estado: true } 
        });

        if (!ultimoHistorial) {
          throw new BadRequestException('La incidencia no tiene un historial de estados válido.');
        }

        const nombreEstadoActual = ultimoHistorial.estado.nombre_estado.toUpperCase();

        if (nombreEstadoActual !== 'ASIGNADA') {
          throw new BadRequestException(`Transición no válida: No se puede pasar de ${nombreEstadoActual} a RESUELTA.`);
        }

        const estadoDestino = await transaction.estadoIncidencia.findFirst({
          where: { 
            nombre_estado: { 
              equals: 'Resuelta', 
              mode: 'insensitive'
            } 
          }
        });

        if (!estadoDestino) {
          throw new InternalServerErrorException('Error de configuración: El estado "Resuelta" no existe en la base de datos.');
        }
        
        const nuevoHistorial = await transaction.historialEstados.create({
          data: {
            id_incidencia: idIncidencia,
            id_estado: estadoDestino.id_estado,
            id_usuario_cambio: idTecnico,
          },
          include: { estado: true }
        });

        return nuevoHistorial;
      });
    }

  private toApiIncidencia(incidencia: IncidenciaConEstadoActual) {
    const estado = incidencia.historial_estados[0]?.estado;
    return {
      id_incidencia: incidencia.id_incidencia,
      id_activo: incidencia.id_activo,
      id_reportante: incidencia.id_reportante,
      titulo: incidencia.titulo,
      descripcion: incidencia.descripcion,
      estado: estado || null,
      evidencias: incidencia.evidencias?.map(e => e.url_cloudinary) || [],
      fecha_creacion: incidencia.fecha_creacion,
    };
  }

  private toApiEvidencia(evidencia: any) {
    return {
      id_evidencia: evidencia.id_evidencia,
      id_incidencia: evidencia.id_incidencia,
      tipo: evidencia.tipo_evidencia,
      url_evidencia: evidencia.url_cloudinary,
      fecha_creacion: evidencia.fecha_creacion,
    };
  }
}