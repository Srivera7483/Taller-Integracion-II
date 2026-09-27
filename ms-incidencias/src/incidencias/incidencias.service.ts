import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class IncidenciasService {
  constructor(private readonly prisma: PrismaService) {}

  async actualizarEstado(
    incidenciaId: string,
    idEstadoNuevo: number,
    usuarioId: string,
  ) {
    if (!idEstadoNuevo || typeof idEstadoNuevo !== 'number') {
      throw new BadRequestException(
        'El ID del estado es obligatorio y debe ser numérico',
      );
    }

    if (!usuarioId) {
      throw new BadRequestException('El usuario es obligatorio');
    }

    return this.prisma.$transaction(async (transaction) => {
      const incidencia = await transaction.incidencias.findUnique({
        where: { id_incidencia: incidenciaId },
        select: { id_incidencia: true },
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

      const nuevoHistorial = await transaction.historialEstados.create({
        data: {
          id_incidencia: incidencia.id_incidencia,
          id_estado: idEstadoNuevo,
          id_usuario_cambio: usuarioId,
        },
        include: {
          estado: true,
        },
      });

      return nuevoHistorial;
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