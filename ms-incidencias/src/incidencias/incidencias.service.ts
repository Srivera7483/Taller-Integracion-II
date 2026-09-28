import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IncidenciasService {
  constructor(private readonly prisma: PrismaService) {}

  private formatearIncidencia(incidencia: any) {
    const ultimoHistorial = incidencia.historial_estados[0];
    return {
      id_incidencia: incidencia.id_incidencia,
      id_activo: incidencia.id_activo,
      id_reportante: incidencia.id_reportante,
      titulo: incidencia.titulo,
      descripcion: incidencia.descripcion,
      estado: ultimoHistorial ? ultimoHistorial.estado : null,
      fecha_creacion: incidencia.fecha_creacion,
    };
  }

  async actualizarEstado(
    incidenciaId: string,
    idEstadoNuevo: number,
    usuarioId: string,
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

      await transaction.historialEstados.create({
        data: {
          id_incidencia: incidencia.id_incidencia,
          id_estado: idEstadoNuevo,
          id_usuario_cambio: usuarioId,
        },
      });

      const incidenciaActualizada = await transaction.incidencias.findUnique({
        where: { id_incidencia: incidenciaId },
        include: {
          historial_estados: {
            orderBy: { fecha_creacion: 'desc' },
            take: 1, // Traemos solo el estado más reciente
            include: { estado: true },
          },
        },
      });

      return this.formatearIncidencia(incidenciaActualizada);
    });
  }
}