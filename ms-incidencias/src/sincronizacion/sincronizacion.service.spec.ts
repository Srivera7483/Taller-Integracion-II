import { SincronizacionService } from './sincronizacion.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { IncidenciasService } from '../incidencias/incidencias.service';

describe('SincronizacionService (TAL-192 / TAL-193 Concurrencia Optimista)', () => {
  const txMock = {
    incidencias: { findUnique: jest.fn() },
    estadoIncidencia: { findUnique: jest.fn() },
    historialEstados: { findFirst: jest.fn(), create: jest.fn() },
  };

  const prismaMock = {
    $transaction: jest.fn((cb: (tx: typeof txMock) => Promise<unknown>) =>
      cb(txMock),
    ),
  } as unknown as PrismaService;

  const incidenciasServiceMock = {
    crear: jest.fn(),
  } as unknown as IncidenciasService;

  const service = new SincronizacionService(prismaMock, incidenciasServiceMock);

  beforeEach(() => {
    jest.clearAllMocks();
    txMock.incidencias.findUnique.mockResolvedValue({ id_incidencia: 'inc-1' });
    txMock.estadoIncidencia.findUnique.mockResolvedValue({
      id_estado: 3,
      nombre_estado: 'Resuelta',
    });
    txMock.historialEstados.create.mockResolvedValue({});
  });

  it('reporta conflicto 409 en 207 Multi-Status si el servidor tiene un estado mas reciente que timestamp_local', async () => {
    txMock.historialEstados.findFirst.mockResolvedValue({
      id_estado: 4,
      fecha_creacion: new Date('2026-11-25T16:00:00.000Z'),
      estado: { nombre_estado: 'Cerrada' },
    });

    const resultado = await service.procesarLote(
      [
        {
          id_accion_local: 'acc-offline-1',
          tipo: 'actualizar_estado',
          payload: { id_incidencia: 'inc-1', id_estado: 3 },
          timestamp_local: '2026-11-25T15:00:00.000Z',
        },
      ],
      {
        sub: 'tec-1',
        permissions: ['incidencias:resolver'],
      },
    );

    expect(resultado.statusCode).toBe(207);
    expect(resultado.resumen).toEqual({ total: 1, exitosos: 0, errores: 1 });
    expect(resultado.detalle[0].estado).toBe('ERROR');
    expect(resultado.detalle[0].motivo).toContain('Conflicto de concurrencia (409)');
    expect(txMock.historialEstados.create).not.toHaveBeenCalled();
  });

  it('aplica la actualizacion offline (200 OK) si timestamp_local es posterior al ultimo historial del servidor', async () => {
    txMock.historialEstados.findFirst.mockResolvedValue({
      id_estado: 2,
      fecha_creacion: new Date('2026-11-25T14:00:00.000Z'),
      estado: { nombre_estado: 'Asignada' },
    });

    const resultado = await service.procesarLote(
      [
        {
          id_accion_local: 'acc-offline-2',
          tipo: 'actualizar_estado',
          payload: { id_incidencia: 'inc-1', id_estado: 3 },
          timestamp_local: '2026-11-25T15:00:00.000Z',
        },
      ],
      {
        sub: 'tec-1',
        permissions: ['incidencias:resolver'],
      },
    );

    expect(resultado.statusCode).toBe(200);
    expect(resultado.resumen).toEqual({ total: 1, exitosos: 1, errores: 0 });
    expect(txMock.historialEstados.create).toHaveBeenCalledTimes(1);
  });
});
