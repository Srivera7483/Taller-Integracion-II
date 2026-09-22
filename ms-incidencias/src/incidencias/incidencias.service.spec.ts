import { BadRequestException } from '@nestjs/common';
import { EstadoIncidencia } from '@prisma/client';
import { IncidenciasService } from './incidencias.service';

describe('IncidenciasService', () => {
  const findUnique = jest.fn();
  const update = jest.fn();
  const createHistory = jest.fn();
  const transaction = jest.fn((callback) =>
    callback({
      incidencias: { findUnique, update },
      historialIncidencia: { create: createHistory },
    }),
  );
  const prisma = { $transaction: transaction } as never;
  const service = new IncidenciasService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('actualiza el estado y registra el cambio dentro de una transacción', async () => {
    findUnique.mockResolvedValue({
      id_incidencia: 'incidencia-1',
      estado: EstadoIncidencia.Reportada,
    });
    update.mockResolvedValue({
      id_incidencia: 'incidencia-1',
      estado: EstadoIncidencia.Asignada,
    });

    await service.actualizarEstado(
      'incidencia-1',
      EstadoIncidencia.Asignada,
      'usuario-1',
    );

    expect(update).toHaveBeenCalledWith({
      where: { id_incidencia: 'incidencia-1' },
      data: { estado: EstadoIncidencia.Asignada },
    });
    expect(createHistory).toHaveBeenCalledWith({
      data: {
        incidencia_id: 'incidencia-1',
        estado_anterior: EstadoIncidencia.Reportada,
        estado_nuevo: EstadoIncidencia.Asignada,
        usuario_id: 'usuario-1',
      },
    });
  });

  it('rechaza estados que no pertenezcan al enum', async () => {
    await expect(
      service.actualizarEstado(
        'incidencia-1',
        'Cancelada' as EstadoIncidencia,
        'usuario-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('no crea historial si el estado no cambia', async () => {
    findUnique.mockResolvedValue({
      id_incidencia: 'incidencia-1',
      estado: EstadoIncidencia.Reportada,
    });

    await service.actualizarEstado(
      'incidencia-1',
      EstadoIncidencia.Reportada,
      'usuario-1',
    );

    expect(update).not.toHaveBeenCalled();
    expect(createHistory).not.toHaveBeenCalled();
  });

  it('propaga el fallo del update y no registra historial', async () => {
    findUnique.mockResolvedValue({
      id_incidencia: 'incidencia-1',
      estado: EstadoIncidencia.Reportada,
    });
    update.mockRejectedValue(new Error('fallo de base de datos'));

    await expect(
      service.actualizarEstado(
        'incidencia-1',
        EstadoIncidencia.Asignada,
        'usuario-1',
      ),
    ).rejects.toThrow('fallo de base de datos');

    expect(createHistory).not.toHaveBeenCalled();
  });
});
