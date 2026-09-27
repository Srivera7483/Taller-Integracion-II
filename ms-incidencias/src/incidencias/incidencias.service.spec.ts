import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';

describe('IncidenciasService', () => {
  const findUniqueIncidencia = jest.fn();
  const findUniqueEstado = jest.fn();
  const createHistorial = jest.fn();
  const transaction = jest.fn((callback) =>
    callback({
      incidencias: { findUnique: findUniqueIncidencia },
      estadoIncidencia: { findUnique: findUniqueEstado },
      historialEstados: { create: createHistorial },
    }),
  );
  const prisma = {
    $transaction: transaction,
    ordenTrabajo: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as never;
  const service = new IncidenciasService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('actualiza el estado y registra el cambio dentro de una transacción', async () => {
    findUniqueIncidencia.mockResolvedValue({
      id_incidencia: 'incidencia-1',
    });
    findUniqueEstado.mockResolvedValue({
      id_estado: 2,
      nombre_estado: 'Asignada',
    });
    createHistorial.mockResolvedValue({
      id_historial: 'hist-1',
      id_incidencia: 'incidencia-1',
      id_estado: 2,
      id_usuario_cambio: 'usuario-1',
    });

    const resultado = await service.actualizarEstado(
      'incidencia-1',
      2,
      'usuario-1',
    );

    expect(findUniqueIncidencia).toHaveBeenCalledWith({
      where: { id_incidencia: 'incidencia-1' },
      select: { id_incidencia: true },
    });
    expect(findUniqueEstado).toHaveBeenCalledWith({
      where: { id_estado: 2 },
    });
    expect(createHistorial).toHaveBeenCalledWith({
      data: {
        id_incidencia: 'incidencia-1',
        id_estado: 2,
        id_usuario_cambio: 'usuario-1',
      },
      include: {
        estado: true,
      },
    });
    expect(resultado).toEqual({
      id_historial: 'hist-1',
      id_incidencia: 'incidencia-1',
      id_estado: 2,
      id_usuario_cambio: 'usuario-1',
    });
  });

  it('rechaza si el id_estado no es numérico o es inválido', async () => {
    await expect(
      service.actualizarEstado(
        'incidencia-1',
        undefined as never,
        'usuario-1',
      ),
    ).rejects.toThrow(BadRequestException);

    expect(transaction).not.toHaveBeenCalled();
  });

  it('rechaza si la incidencia no existe', async () => {
    findUniqueIncidencia.mockResolvedValue(null);

    await expect(
      service.actualizarEstado(
        'incidencia-inexistente',
        2,
        'usuario-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza si el estado no existe en la base de datos', async () => {
    findUniqueIncidencia.mockResolvedValue({ id_incidencia: 'inc-1' });
    findUniqueEstado.mockResolvedValue(null);

    await expect(
      service.actualizarEstado(
        'inc-1',
        999,
        'usuario-1',
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
