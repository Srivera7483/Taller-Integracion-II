import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EstadoIncidencia, EstadoOrdenTrabajo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AsignarOrdenDto } from './dto/asignar-orden.dto';

@Injectable()
export class OrdenesTrabajoService {
  constructor(private readonly prisma: PrismaService) {}

  async asignarOrden(dto: AsignarOrdenDto, supervisorId: string) {
    if (!dto.incidencia_id || typeof dto.incidencia_id !== 'string') {
      throw new BadRequestException('El ID de la incidencia es obligatorio');
    }

    if (!dto.tecnico_id || typeof dto.tecnico_id !== 'string') {
      throw new BadRequestException('El ID del técnico es obligatorio');
    }

    if (!supervisorId) {
      throw new BadRequestException('El usuario supervisor es obligatorio');
    }

    return this.prisma.$transaction(async (transaction) => {
      const incidencia = await transaction.incidencias.findUnique({
        where: { id_incidencia: dto.incidencia_id },
        select: { id_incidencia: true, estado: true },
      });

      if (!incidencia) {
        throw new NotFoundException('Incidencia no encontrada');
      }

      if (incidencia.estado === EstadoIncidencia.Resuelta) {
        throw new BadRequestException(
          'No se puede asignar una orden de trabajo a una incidencia ya resuelta',
        );
      }

      const nuevaOrden = await transaction.ordenTrabajo.create({
        data: {
          incidencia_id: dto.incidencia_id,
          tecnico_id: dto.tecnico_id,
          estado: EstadoOrdenTrabajo.Pendiente,
          instrucciones: dto.instrucciones?.trim() || null,
        },
      });

      if (incidencia.estado !== EstadoIncidencia.Asignada) {
        await transaction.incidencias.update({
          where: { id_incidencia: dto.incidencia_id },
          data: { estado: EstadoIncidencia.Asignada },
        });

        await transaction.historialIncidencia.create({
          data: {
            incidencia_id: dto.incidencia_id,
            estado_anterior: incidencia.estado,
            estado_nuevo: EstadoIncidencia.Asignada,
            usuario_id: supervisorId,
          },
        });
      }

      return nuevaOrden;
    });
  }

  async obtenerPorId(idOrden: string) {
    const orden = await this.prisma.ordenTrabajo.findUnique({
      where: { id_orden: idOrden },
      include: { incidencia: true },
    });

    if (!orden) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    return orden;
  }

  async listarPorTecnico(tecnicoId: string) {
    if (!tecnicoId) {
      throw new BadRequestException('El ID del técnico es obligatorio');
    }

    return this.prisma.ordenTrabajo.findMany({
      where: { tecnico_id: tecnicoId },
      include: { incidencia: true },
      orderBy: { fecha_asignacion: 'desc' },
    });
  }

  async listarTodas() {
    return this.prisma.ordenTrabajo.findMany({
      include: { incidencia: true },
      orderBy: { fecha_asignacion: 'desc' },
    });
  }
}
