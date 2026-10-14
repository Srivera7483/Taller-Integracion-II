import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { IncidenciasService } from './incidencias.service';
import { of, throwError } from 'rxjs';

describe('IncidenciasService notifications', () => {
  const incidenciaCreada = {
    id_incidencia: 'incidencia-1',
    id_activo: 'activo-1',
    id_reportante: 'reportante-1',
    titulo: 'Falla de proyector',
    descripcion: 'No enciende',
    fecha_creacion: new Date('2026-10-05T12:00:00Z'),
    historial_estados: [
      { estado: { id_estado: 1, nombre_estado: 'Reportada' } },
    ],
  };
  const transaction = {
    estadoIncidencia: { findFirst: jest.fn(), findUnique: jest.fn() },
    incidencias: { create: jest.fn(), findUnique: jest.fn() },
    historialEstados: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(
      (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    ),
  } as unknown as PrismaService;
  const postMock = jest.fn();
  const httpService = { post: postMock } as unknown as HttpService;
  const service = new IncidenciasService(prisma, httpService);

  beforeEach(() => {
    jest.clearAllMocks();
    transaction.estadoIncidencia.findFirst.mockResolvedValue({
      id_estado: 1,
      nombre_estado: 'Reportada',
    });
    transaction.incidencias.create.mockResolvedValue(incidenciaCreada);
    transaction.incidencias.findUnique.mockResolvedValue(incidenciaCreada);
    transaction.historialEstados.create.mockResolvedValue({});
    postMock.mockReturnValue(of({ data: { status: 'encolada' } }));
  });

  it('notifica después de crear la incidencia y devuelve la respuesta original', async () => {
    const resultado = await service.crear(
      {
        id_activo: 'activo-1',
        titulo: 'Falla de proyector',
        descripcion: 'No enciende',
      },
      'reportante-1',
      'reportante@example.com',
    );

    expect(resultado).toMatchObject({
      id_incidencia: 'incidencia-1',
      titulo: 'Falla de proyector',
    });
    expect(postMock).toHaveBeenCalledWith(
      'http://ms-notificaciones:3004/notificar',
      {
        email: 'reportante@example.com',
        asunto: 'Nueva Incidencia Reportada: Falla de proyector',
        cuerpoMensaje:
          'La incidencia "Falla de proyector" fue reportada correctamente.',
      },
    );
    expect(
      (prisma.$transaction as jest.Mock).mock.invocationCallOrder[0],
    ).toBeLessThan(
      postMock.mock.invocationCallOrder[0],
    );
  });

  it('no propaga fallos de notificación ni altera la respuesta de creación', async () => {
    postMock.mockReturnValue(
      throwError(() => new Error('servicio no disponible')),
    );

    await expect(
      service.crear(
        {
          id_activo: 'activo-1',
          titulo: 'Falla de proyector',
          descripcion: 'No enciende',
        },
        'reportante-1',
        'reportante@example.com',
      ),
    ).resolves.toMatchObject({
      id_incidencia: 'incidencia-1',
      titulo: 'Falla de proyector',
    });
  });

  it('notifica al cambiar el estado a Resuelta después de la transacción', async () => {
    const incidenciaAsignada = {
      ...incidenciaCreada,
      historial_estados: [
        { estado: { id_estado: 2, nombre_estado: 'Asignada' } },
      ],
    };
    const incidenciaResuelta = {
      ...incidenciaCreada,
      historial_estados: [
        { estado: { id_estado: 3, nombre_estado: 'Resuelta' } },
      ],
    };
    transaction.incidencias.findUnique
      .mockResolvedValueOnce(incidenciaAsignada)
      .mockResolvedValueOnce(incidenciaResuelta);
    transaction.estadoIncidencia.findUnique.mockResolvedValue({
      id_estado: 3,
      nombre_estado: 'Resuelta',
    });

    const resultado = await service.actualizarEstado(
      'incidencia-1',
      3,
      'tecnico-1',
      'Técnico',
      'tecnico@example.com',
    );

    expect(resultado.estado?.nombre_estado).toBe('Resuelta');
    expect(postMock).toHaveBeenCalledWith(
      'http://ms-notificaciones:3004/notificar',
      {
        email: 'tecnico@example.com',
        asunto: 'Incidencia Resuelta: Falla de proyector',
        cuerpoMensaje: 'La incidencia "Falla de proyector" fue resuelta.',
      },
    );
  });

  describe('TAL-115: Prioridad Dinámica en IncidenciasService', () => {
    it('incluye campos de prioridad relativa y escalamiento al consultar o crear incidencia', async () => {
      const resultado = await service.crear(
        {
          id_activo: 'activo-1',
          titulo: 'Falla de proyector',
          descripcion: 'No enciende',
        },
        'reportante-1',
        'reportante@example.com',
      );

      expect(resultado).toHaveProperty('prioridad');
      expect(resultado).toHaveProperty('prioridad_original');
      expect(resultado).toHaveProperty('prioridad_relativa');
      expect(resultado).toHaveProperty('escalada');
      expect(resultado).toHaveProperty('tiempo_inactividad_horas');
    });

    it('retorna el calculo individual de prioridad dinamica con obtenerPrioridadDinamica', async () => {
      const mockPrisma = prisma as any;
      mockPrisma.incidencias = {
        findUnique: jest.fn().mockResolvedValue({
          ...incidenciaCreada,
          fecha_creacion: new Date(Date.now() - 72 * 3600 * 1000), // 72 horas (> 48h)
        }),
      };

      const resultado = await service.obtenerPrioridadDinamica('incidencia-1');

      expect(resultado.valido).toBe(true);
      expect(resultado.escalada).toBe(true);
      expect(resultado.tiempo_inactividad_horas).toBeGreaterThanOrEqual(72);
      expect(resultado.prioridad_relativa).toBe('Alta'); // Base Media -> Alta
      expect(resultado.motivo_escalamiento).toContain('Inactividad superior a 48h');
    });
  });
});

