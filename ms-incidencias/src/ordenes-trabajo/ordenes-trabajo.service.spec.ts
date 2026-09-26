import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EstadoIncidencia, EstadoOrdenTrabajo } from '@prisma/client';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';

describe('OrdenesTrabajoService', () => {
  const findUniqueIncidencia = jest.fn();
  const updateIncidencia = jest.fn();
  const createOrden = jest.fn();
  const createHistory = jest.fn();
  const findUniqueOrden = jest.fn();
  const findManyOrdenes = jest.fn();

  const transaction = jest.fn((callback) =>
    callback({
      incidencias: { findUnique: findUniqueIncidencia, update: updateIncidencia },
      ordenTrabajo: { create: createOrden, findUnique: findUniqueOrden, findMany: findManyOrdenes },
      historialIncidencia: { create: createHistory },
    }),
  );

  const prisma = {
    $transaction: transaction,
    ordenTrabajo: { findUnique: findUniqueOrden, findMany: findManyOrdenes },
  } as never;

  const service = new OrdenesTrabajoService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('asigna una orden de trabajo, actualiza incidencia a Asignada y crea historial en una transacción', async () => {
    findUniqueIncidencia.mockResolvedValue({
      id_incidencia: 'incidencia-1',
      estado: EstadoIncidencia.Reportada,
    });

    createOrden.mockResolvedValue({
      id_orden: 'orden-1',
      incidencia_id: 'incidencia-1',
      tecnico_id: 'tecnico-1',
      estado: EstadoOrdenTrabajo.Pendiente,
      instrucciones: 'Revisar cable HDMI',
    });

    const resultado = await service.asignarOrden(
      {
        incidencia_id: 'incidencia-1',
        tecnico_id: 'tecnico-1',
        instrucciones: 'Revisar cable HDMI',
      },
      'supervisor-1',
    );

    expect(createOrden).toHaveBeenCalledWith({
      data: {
        incidencia_id: 'incidencia-1',
        tecnico_id: 'tecnico-1',
        estado: EstadoOrdenTrabajo.Pendiente,
        instrucciones: 'Revisar cable HDMI',
      },
    });

    expect(updateIncidencia).toHaveBeenCalledWith({
      where: { id_incidencia: 'incidencia-1' },
      data: { estado: EstadoIncidencia.Asignada },
    });

    expect(createHistory).toHaveBeenCalledWith({
      data: {
        incidencia_id: 'incidencia-1',
        estado_anterior: EstadoIncidencia.Reportada,
        estado_nuevo: EstadoIncidencia.Asignada,
        usuario_id: 'supervisor-1',
      },
    });

    expect(resultado).toEqual(
      expect.objectContaining({
        id_orden: 'orden-1',
        incidencia_id: 'incidencia-1',
        tecnico_id: 'tecnico-1',
      }),
    );
  });

  it('rechaza asignación si la incidencia no existe', async () => {
    findUniqueIncidencia.mockResolvedValue(null);

    await expect(
      service.asignarOrden(
        { incidencia_id: 'incidencia-inexistente', tecnico_id: 'tecnico-1' },
        'supervisor-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza asignación si la incidencia ya está Resuelta', async () => {
    findUniqueIncidencia.mockResolvedValue({
      id_incidencia: 'incidencia-1',
      estado: EstadoIncidencia.Resuelta,
    });

    await expect(
      service.asignarOrden(
        { incidencia_id: 'incidencia-1', tecnico_id: 'tecnico-1' },
        'supervisor-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza si faltan campos obligatorios', async () => {
    await expect(
      service.asignarOrden(
        { incidencia_id: '', tecnico_id: 'tecnico-1' },
        'supervisor-1',
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.asignarOrden(
        { incidencia_id: 'incidencia-1', tecnico_id: '' },
        'supervisor-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
