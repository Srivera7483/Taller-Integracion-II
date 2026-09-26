import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EstadoIncidencia } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const estadosIncidencia = new Set<string>(Object.values(EstadoIncidencia));

@Injectable()
export class IncidenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async actualizarEstado(
    incidenciaId: string,
    estadoNuevo: EstadoIncidencia,
    usuarioId: string,
  ) {
    if (!estadosIncidencia.has(estadoNuevo)) {
      throw new BadRequestException('Estado de incidencia inválido');
    }

    if (!usuarioId) {
      throw new BadRequestException('El usuario es obligatorio');
    }

    return this.prisma.$transaction(async (transaction) => {
      const incidencia = await transaction.incidencias.findUnique({
        where: { id_incidencia: incidenciaId },
        select: { id_incidencia: true, estado: true },
      });

      if (!incidencia) {
        throw new NotFoundException('Incidencia no encontrada');
      }

      if (incidencia.estado === estadoNuevo) {
        return incidencia;
      }

      const incidenciaActualizada = await transaction.incidencias.update({
        where: { id_incidencia: incidenciaId },
        data: { estado: estadoNuevo },
      });

      await transaction.historialIncidencia.create({
        data: {
          id_incidencia: incidencia.id_incidencia, // Homologado con el último schema
          estado_anterior: incidencia.estado,
          estado_nuevo: estadoNuevo,
          usuario_id: usuarioId,
        },
      });

      return incidenciaActualizada;
    });
  }

  async actualizarDiagnostico(
    id_orden: string,
    diagnostico_tecnico: string,
    id_tecnico_peticion: string,
  ) {
    const orden = await this.prisma.ordenTrabajo.findUnique({
      where: { id_orden },
    });

    if (!orden) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    if (orden.id_tecnico !== id_tecnico_peticion) {
      throw new ForbiddenException(
        'Acceso denegado: El ID del técnico no coincide con el asignado a esta orden.',
      );
    }

    return this.prisma.ordenTrabajo.update({
      where: { id_orden },
      data: { diagnostico_tecnico },
    });
  }
}