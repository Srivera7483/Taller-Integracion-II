import {
  BadRequestException,
  Injectable,
  NotFoundException,
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
          incidencia_id: incidencia.id_incidencia,
          estado_anterior: incidencia.estado,
          estado_nuevo: estadoNuevo,
          usuario_id: usuarioId,
        },
      });

      return incidenciaActualizada;
    });
  }
}
