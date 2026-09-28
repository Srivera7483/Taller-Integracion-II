import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';

describe('OrdenesTrabajoService', () => {
  const createService = () => {
    const findIncidencia = jest.fn();
    const createOrden = jest.fn();
    const findOrden = jest.fn();
    const updateOrden = jest.fn();
    const prisma = {
      incidencias: { findUnique: findIncidencia },
      ordenTrabajo: {
        create: createOrden,
        findUnique: findOrden,
        findMany: jest.fn(),
        update: updateOrden,
      },
    } as unknown as PrismaService;
    return {
      service: new OrdenesTrabajoService(prisma),
      findIncidencia,
      createOrden,
      findOrden,
      updateOrden,
    };
  };

  it('crea una orden con los nombres de campo del contrato', async () => {
    const { service, findIncidencia, createOrden } = createService();
    findIncidencia.mockResolvedValue({
      id_incidencia: 'incidencia-1',
    });
    createOrden.mockResolvedValue({
      id_orden: 'orden-1',
      id_incidencia: 'incidencia-1',
      id_tecnico: 'tecnico-1',
      diagnostico_tecnico: null,
      fecha_creacion: new Date(),
    } as never);

    await service.crear({
      id_incidencia: 'incidencia-1',
      id_tecnico: 'tecnico-1',
    });

    expect(createOrden).toHaveBeenCalledWith({
      data: { id_incidencia: 'incidencia-1', id_tecnico: 'tecnico-1' },
      select: {
        id_orden: true,
        id_incidencia: true,
        id_tecnico: true,
        diagnostico_tecnico: true,
        fecha_creacion: true,
      },
    });
  });

  it('rechaza asignar una orden a una incidencia inexistente', async () => {
    const { service, findIncidencia, createOrden } = createService();
    findIncidencia.mockResolvedValue(null);

    await expect(
      service.crear({ id_incidencia: 'missing', id_tecnico: 'tecnico-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(createOrden).not.toHaveBeenCalled();
  });

  it('solo permite diagnóstico al técnico asignado', async () => {
    const { service, findOrden, updateOrden } = createService();
    findOrden.mockResolvedValue({
      id_orden: 'orden-1',
      id_tecnico: 'tecnico-asignado',
    });

    await expect(
      service.actualizarDiagnostico(
        'orden-1',
        { diagnostico_tecnico: 'Revisión completada' },
        { id: 'otro-tecnico', role: 'TECNICO' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(updateOrden).not.toHaveBeenCalled();
  });
});