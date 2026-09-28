import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { ActualizarDiagnosticoDto } from '../incidencias/dto/actualizar-diagnostico.dto';
import type { CrearOrdenTrabajoDto } from './dto/crear-orden-trabajo.dto';
import type { ListarOrdenesTrabajoQueryDto } from './dto/listar-ordenes-trabajo-query.dto';

const ordenContratoSelect = {
  id_orden: true,
  id_incidencia: true,
  id_tecnico: true,
  diagnostico_tecnico: true,
  fecha_creacion: true,
} satisfies Prisma.OrdenTrabajoSelect;

@Injectable()
export class OrdenesTrabajoService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearOrdenTrabajoDto) {
    const incidencia = await this.prisma.incidencias.findUnique({
      where: { id_incidencia: dto.id_incidencia },
      select: { id_incidencia: true },
    });
    if (!incidencia) throw new NotFoundException('Incidencia no encontrada');

    return this.prisma.ordenTrabajo.create({
      data: {
        id_incidencia: incidencia.id_incidencia,
        id_tecnico: dto.id_tecnico,
      },
      select: ordenContratoSelect,
    });
  }

  async obtener(idOrden: string) {
    const orden = await this.prisma.ordenTrabajo.findUnique({
      where: { id_orden: idOrden },
      select: ordenContratoSelect,
    });
    if (!orden) throw new NotFoundException('Orden de trabajo no encontrada');
    return orden;
  }

  async listar(query: ListarOrdenesTrabajoQueryDto) {
    return this.prisma.ordenTrabajo.findMany({
      where: {
        ...(query.id_incidencia ? { id_incidencia: query.id_incidencia } : {}),
        ...(query.id_tecnico ? { id_tecnico: query.id_tecnico } : {}),
      },
      select: ordenContratoSelect,
      orderBy: [{ fecha_creacion: 'desc' }, { id_orden: 'desc' }],
    });
  }

  async actualizarDiagnostico(
    idOrden: string,
    dto: ActualizarDiagnosticoDto,
    usuario: AuthenticatedUser,
  ) {
    const orden = await this.prisma.ordenTrabajo.findUnique({
      where: { id_orden: idOrden },
      select: { id_orden: true, id_tecnico: true },
    });
    if (!orden) throw new NotFoundException('Orden de trabajo no encontrada');
    if (orden.id_tecnico !== usuario.id) {
      throw new ForbiddenException('Solo el técnico asignado puede registrar el diagnóstico');
    }

    return this.prisma.ordenTrabajo.update({
      where: { id_orden: idOrden },
      data: { diagnostico_tecnico: dto.diagnostico_tecnico.trim() },
      select: ordenContratoSelect,
    });
  }
}
