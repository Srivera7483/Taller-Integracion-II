import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AsignarOrdenDto } from './dto/asignar-orden.dto';
import { FiltrarOrdenesDto } from './dto/filtrar-ordenes.dto';
import { sanitizeStringXss } from '../validators/sanitize-xss.pipe';

@Injectable()
export class OrdenesTrabajoService {
  constructor(private readonly prisma: PrismaService) { }

  async asignarOrden(dto: AsignarOrdenDto, usuarioCambioId: string) {
    if (!dto.id_incidencia || typeof dto.id_incidencia !== 'string') {
      throw new BadRequestException('El ID de la incidencia es obligatorio');
    }

    if (!dto.id_tecnico || typeof dto.id_tecnico !== 'string') {
      throw new BadRequestException('El ID del técnico es obligatorio');
    }

    return this.prisma.$transaction(async (transaction) => {
      const incidencia = await transaction.incidencias.findUnique({
        where: { id_incidencia: dto.id_incidencia },
        select: { id_incidencia: true },
      });

      if (!incidencia) {
        throw new NotFoundException('Incidencia no encontrada');
      }

      const diagnosticoSanitizado = dto.diagnostico_tecnico
        ? sanitizeStringXss(dto.diagnostico_tecnico).trim()
        : null;

      const nuevaOrden = await transaction.ordenTrabajo.create({
        data: {
          id_incidencia: dto.id_incidencia,
          id_tecnico: dto.id_tecnico,
          diagnostico_tecnico: diagnosticoSanitizado,
        },
      });

      return nuevaOrden;
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

    // El técnico queda asociado a su propia orden.
    // Supervisores y administradores pueden indicar el técnico.
    const idTecnico = esSupervisorOAdmin
      ? dto.id_tecnico
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

      // Evitar crear órdenes duplicadas para una incidencia.
      const ordenExistente = await transaction.ordenTrabajo.findFirst({
        where: { id_incidencia: dto.id_incidencia },
      });

      if (ordenExistente) {
        if (
          ordenExistente.id_tecnico !== idUsuario &&
          !esSupervisorOAdmin
        ) {
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
            include: { evidencias: true },
          },
        },
        orderBy: { fecha_creacion: orden },
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

    const [total, ordenes] = await Promise.all([
      this.prisma.ordenTrabajo.count({ where }),
      this.prisma.ordenTrabajo.findMany({
        where,
        include: {
          incidencia: {
            include: {
              evidencias: true,
            },
          },
        },
        orderBy: {
          fecha_creacion: orden,
        },
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

  async obtenerPorId(idOrden: string) {
    const orden = await this.prisma.ordenTrabajo.findUnique({
      where: { id_orden: idOrden },
      include: {
        incidencia: {
          include: { evidencias: true },
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
    });

    if (!orden) {
      throw new NotFoundException('Orden de trabajo no encontrada');
    }

    const rolNorm = (rolUsuario || '').toUpperCase();
    const esSupervisorOAdmin = ['SUPERVISOR', 'ADMINISTRADOR'].includes(rolNorm);

    if (orden.id_tecnico !== idTecnicoPeticion && !esSupervisorOAdmin) {
      throw new ForbiddenException(
        'Acceso denegado: Solo el técnico asignado, un supervisor o un administrador pueden registrar el diagnóstico.',
      );
    }

    const diagnosticoSanitizado = sanitizeStringXss(diagnostico_tecnico).trim();

    return this.prisma.ordenTrabajo.update({
      where: { id_orden: idOrden },
      data: { diagnostico_tecnico: diagnosticoSanitizado },
    });
  }
}
