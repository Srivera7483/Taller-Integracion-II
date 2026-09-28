import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IncidenciasService } from './incidencias.service';

describe('IncidenciasService', () => {
  const reportada = { id_estado: 1, nombre_estado: 'Reportada' };
  const asignada = { id_estado: 2, nombre_estado: 'Asignada' };
  const usuario = { id: 'reportante-1', role: 'REPORTANTE' };

  const createService = () => {
    const transactionClient = {
      estadoIncidencia: { findUnique: jest.fn() },
      incidencias: { create: jest.fn(), findUnique: jest.fn() },
      historialIncidencia: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback) => callback(transactionClient)),
    } as unknown as PrismaService;
    return { service: new IncidenciasService(prisma), transactionClient };
  };

  it('crea incidencia e historial inicial en una transacción', async () => {
    const { service, transactionClient } = createService();
    const id = 'incidencia-1';
    const fecha = new Date('2026-09-27T12:00:00.000Z');
    transactionClient.estadoIncidencia.findUnique.mockResolvedValue(reportada);
    transactionClient.incidencias.create.mockResolvedValue({ id_incidencia: id });
    transactionClient.incidencias.findUnique.mockResolvedValue({
      id_incidencia: id,
      id_activo: 'activo-1',
      id_reportante: usuario.id,
      titulo: 'Equipo sin energía',
      descripcion: 'El equipo no enciende.',
      fecha_creacion: fecha,
      historial: [{ estado: reportada }],
    });

    const result = await service.crear(
      {
        id_activo: 'activo-1',
        titulo: 'Equipo sin energía',
        descripcion: 'El equipo no enciende.',
      },
      usuario,
    );

    expect(transactionClient.incidencias.create).toHaveBeenCalledWith({
      data: {
        id_activo: 'activo-1',
        id_reportante: usuario.id,
        titulo: 'Equipo sin energía',
        descripcion: 'El equipo no enciende.',
      },
    });
    expect(transactionClient.historialIncidencia.create).toHaveBeenCalledWith({
      data: {
        id_incidencia: id,
        id_estado: reportada.id_estado,
        id_usuario_cambio: usuario.id,
      },
    });
    expect(result.estado).toEqual(reportada);
    expect(result.fecha_creacion).toBe(fecha);
  });

  it('deniega un cambio de estado cuando el rol no corresponde a la etapa', async () => {
    const { service, transactionClient } = createService();
    transactionClient.incidencias.findUnique.mockResolvedValue({
      id_incidencia: 'incidencia-1',
      id_activo: 'activo-1',
      id_reportante: usuario.id,
      titulo: 'Equipo sin energía',
      descripcion: 'El equipo no enciende.',
      fecha_creacion: new Date(),
      historial: [{ estado: reportada }],
    });
    transactionClient.estadoIncidencia.findUnique.mockResolvedValue(asignada);

    await expect(
      service.actualizarEstado(
        'incidencia-1',
        { id_estado: asignada.id_estado },
        { id: 'tecnico-1', role: 'TECNICO' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transactionClient.historialIncidencia.create).not.toHaveBeenCalled();
  });
});