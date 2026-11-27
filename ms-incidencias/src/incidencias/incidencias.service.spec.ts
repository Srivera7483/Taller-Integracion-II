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
    ordenTrabajo: { findFirst: jest.fn().mockResolvedValue({ id_orden: 'ord-1', id_tecnico: 'tecnico-1' }) }, // <--- Añadir esta línea
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

  describe('TAL-117: Exportación de Incidencias a Excel y CSV', () => {
    it('exporta el listado completo a Excel (.xlsx) por defecto', async () => {
      const mockPrisma = prisma as any;
      mockPrisma.incidencias = {
        findMany: jest.fn().mockResolvedValue([incidenciaCreada]),
      };

      const resultado = await service.exportarIncidencias();

      expect(resultado).toBeDefined();
      expect(resultado.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(resultado.filename).toContain('.xlsx');
      expect(resultado.totalFilas).toBe(1);
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.buffer.length).toBeGreaterThan(0);
    });

    it('exporta a CSV cuando se especifica el formato csv', async () => {
      const mockPrisma = prisma as any;
      mockPrisma.incidencias = {
        findMany: jest.fn().mockResolvedValue([incidenciaCreada]),
      };

      const resultado = await service.exportarIncidencias({ formato: 'csv' });

      expect(resultado).toBeDefined();
      expect(resultado.contentType).toBe('text/csv; charset=utf-8');
      expect(resultado.filename).toContain('.csv');
      expect(resultado.totalFilas).toBe(1);
      expect(resultado.buffer).toBeInstanceOf(Buffer);
      expect(resultado.buffer.toString('utf-8')).toContain('Falla de proyector');
    });

    it('aplica filtros de activo y estado al exportar', async () => {
      const mockPrisma = prisma as any;
      const findManyMock = jest.fn().mockResolvedValue([incidenciaCreada]);
      mockPrisma.incidencias = { findMany: findManyMock };

      await service.exportarIncidencias({
        id_activo: 'activo-1',
        id_estado: 1,
      });

      expect(findManyMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id_activo: 'activo-1' }),
        }),
      );
    });
  });

  describe('TAL-201: Enriquecimiento de Técnico Real, Mis Asignadas y Resumen Dashboard', () => {
    it('enriquece obtener() con datos de orden de trabajo, técnico real, reportante y activo', async () => {
      const mockPrisma = prisma as any;
      const fechaAsignacion = new Date('2026-10-06T09:30:00Z');
      mockPrisma.incidencias = {
        findUnique: jest.fn().mockResolvedValue({
          ...incidenciaCreada,
          ordenes_trabajo: [
            {
              id_orden: 'orden-101',
              id_incidencia: 'incidencia-1',
              id_tecnico: 'tecnico-real-uuid',
              diagnostico_tecnico: 'Cambio de lámpara óptica',
              fecha_creacion: fechaAsignacion,
            },
          ],
        }),
      };

      const getMock = jest.fn((url: string) => {
        if (url.includes('/activos')) {
          return of({
            data: {
              datos: [
                {
                  id: 'activo-1',
                  nombre: 'Proyector Epson Aula 301',
                  codigoQr: 'ACT-2026-0301',
                },
              ],
            },
          });
        }
        return of({
          data: {
            datos: [
              {
                id_usuario: 'tecnico-real-uuid',
                nombre: 'Carlos',
                apellido: 'Ruiz',
                email: 'carlos.ruiz@duoc.cl',
              },
              {
                id_usuario: 'reportante-1',
                nombre: 'Ana',
                apellido: 'Gómez',
                email: 'ana.gomez@duoc.cl',
              },
            ],
          },
        });
      });
      (httpService as any).get = getMock;

      const resultado = await service.obtener('incidencia-1', 'Bearer token-123');

      expect(resultado).toMatchObject({
        id_incidencia: 'incidencia-1',
        id_orden: 'orden-101',
        id_tecnico: 'tecnico-real-uuid',
        nombre_tecnico: 'Carlos Ruiz',
        tecnico_asignado: 'Carlos Ruiz',
        nombre_reportante: 'Ana Gómez',
        nombre_activo: 'Proyector Epson Aula 301',
        codigo_qr_activo: 'ACT-2026-0301',
        diagnostico_tecnico: 'Cambio de lámpara óptica',
        fecha_asignacion: fechaAsignacion,
      });
    });

    it('calcula el resumen global de métricas en obtenerResumenMetricas() sobre toda la BD', async () => {
      const mockPrisma = prisma as any;
      mockPrisma.incidencias = {
        findMany: jest.fn().mockResolvedValue([
          {
            ...incidenciaCreada,
            id_incidencia: 'inc-rep',
            titulo: 'Falla eléctrica crítica en servidor',
            historial_estados: [{ estado: { id_estado: 1, nombre_estado: 'Reportada' } }],
            ordenes_trabajo: [],
          },
          {
            ...incidenciaCreada,
            id_incidencia: 'inc-asig',
            fecha_creacion: new Date(),
            historial_estados: [{ estado: { id_estado: 2, nombre_estado: 'Asignada' } }],
            ordenes_trabajo: [{ id_orden: 'ord-1', id_tecnico: 'tec-1' }],
          },
          {
            ...incidenciaCreada,
            id_incidencia: 'inc-res',
            historial_estados: [{ estado: { id_estado: 3, nombre_estado: 'Resuelta' } }],
            ordenes_trabajo: [{ id_orden: 'ord-2', id_tecnico: 'tec-1' }],
          },
        ]),
      };

      const resumen = await service.obtenerResumenMetricas();

      expect(resumen).toEqual({
        total: 3,
        pendientes: 2,
        reportadas: 1,
        asignadas: 1,
        criticas: 1,
        resueltas: 1,
        cerradas: 0,
        sin_asignar: 1,
      });
    });

    it('separa el estado Cerrada de Órdenes Resueltas para no inflar el contador de Resueltas en el Dashboard', async () => {
      const mockPrisma = prisma as any;
      mockPrisma.incidencias = {
        findMany: jest.fn().mockResolvedValue([
          {
            ...incidenciaCreada,
            id_incidencia: 'inc-resuelta-1',
            historial_estados: [{ estado: { id_estado: 3, nombre_estado: 'Resuelta' } }],
            ordenes_trabajo: [{ id_orden: 'ord-real-1', id_tecnico: 'tec-1' }],
          },
          {
            ...incidenciaCreada,
            id_incidencia: 'inc-cerrada-1',
            historial_estados: [{ estado: { id_estado: 4, nombre_estado: 'Cerrada' } }],
            ordenes_trabajo: [],
          },
        ]),
      };

      const resumen = await service.obtenerResumenMetricas();

      expect(resumen.total).toBe(2);
      expect(resumen.resueltas).toBe(1);
      expect(resumen.cerradas).toBe(1);
    });
  });

  describe('TAL-185: Emisión WebSocket y Sincronización RabbitMQ (TAL-11)', () => {
    it('emite el evento incidencia_actualizada por WebSocket y RabbitMQ al actualizar estado', async () => {
      const mockGateway = {
        emitirIncidenciaActualizada: jest.fn().mockReturnValue({ tiempoMs: 1.5 }),
      } as any;
      const mockRabbitmq = {
        emitirIncidenciaActualizada: jest.fn().mockResolvedValue(true),
      } as any;

      const customService = new IncidenciasService(
        prisma,
        httpService,
        mockRabbitmq,
        undefined as any,
        undefined as any,
        undefined as any,
        mockGateway,
      );

      const incidenciaPendiente = {
        ...incidenciaCreada,
        historial_estados: [
          { estado: { id_estado: 1, nombre_estado: 'Reportada' } },
        ],
      };
      const incidenciaAsignada = {
        ...incidenciaCreada,
        historial_estados: [
          { estado: { id_estado: 2, nombre_estado: 'Asignada' } },
        ],
      };

      transaction.incidencias.findUnique
        .mockResolvedValueOnce(incidenciaPendiente)
        .mockResolvedValueOnce(incidenciaAsignada);
      transaction.estadoIncidencia.findUnique.mockResolvedValue({
        id_estado: 2,
        nombre_estado: 'Asignada',
      });

      const resultado = await customService.actualizarEstado(
        'incidencia-1',
        2,
        'supervisor-1',
        'SUPERVISOR',
      );

      expect(resultado).toBeDefined();
      expect(mockGateway.emitirIncidenciaActualizada).toHaveBeenCalledWith(
        expect.objectContaining({
          id_incidencia: 'incidencia-1',
          nuevo_estado: 'Asignada',
          usuario_responsable: 'supervisor-1',
          tipo_evento: 'CAMBIO_ESTADO',
        }),
        null,
      );
      expect(mockRabbitmq.emitirIncidenciaActualizada).toHaveBeenCalledWith(
        expect.objectContaining({
          evento: 'INCIDENCIA_ACTUALIZADA',
          id_incidencia: 'incidencia-1',
          nuevo_estado: 'Asignada',
          usuario_responsable: 'supervisor-1',
          tipo_evento: 'CAMBIO_ESTADO',
          titulo: 'Falla de proyector',
        }),
      );
    });

    it('incluye email en evento crítico y emailReportante al resolver incidencia vía RabbitMQ (TAL-177)', async () => {
      const mockRabbitmq = {
        emitirIncidenciaCritica: jest.fn().mockResolvedValue(true),
        emitirIncidenciaActualizada: jest.fn().mockResolvedValue(true),
      } as any;

      const customService = new IncidenciasService(
        prisma,
        httpService,
        mockRabbitmq,
      );
      jest.spyOn(customService as any, 'resolverUsuarios').mockResolvedValue(
        new Map([
          ['reportante-1', { nombre: 'Ana', apellido: 'Gómez', email: 'ana.reportante@uct.cl' }],
        ]),
      );

      await customService.crear(
        {
          id_activo: 'activo-1',
          titulo: 'Corte eléctrico',
          descripcion: 'Tablero principal sin energía',
          prioridad: 'critica' as any,
        },
        'reportante-1',
        'ana.reportante@uct.cl',
      );

      expect(mockRabbitmq.emitirIncidenciaCritica).toHaveBeenCalledWith(
        expect.objectContaining({
          evento: 'INCIDENCIA_CRITICA_REGISTRADA',
          email: 'ana.reportante@uct.cl',
          prioridad: 'critica',
        }),
      );

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

      await customService.actualizarEstado(
        'incidencia-1',
        3,
        'tecnico-1',
        'TECNICO',
        'tecnico@uct.cl',
      );

      expect(mockRabbitmq.emitirIncidenciaActualizada).toHaveBeenCalledWith(
        expect.objectContaining({
          evento: 'INCIDENCIA_ACTUALIZADA',
          nuevo_estado: 'Resuelta',
          titulo: 'Falla de proyector',
          emailReportante: 'ana.reportante@uct.cl',
          email: 'ana.reportante@uct.cl',
        }),
      );
    });
  });

  describe('TAL-128: obtenerEstadisticasTiempoResolucion', () => {
    it('calcula MTTR tomando el paso a Resuelta más reciente respecto a la orden vigente y genera desgloses y conteos', async () => {
      const mockIncidencias = [
        {
          id_incidencia: 'inc-1',
          id_activo: 'act-1',
          prioridad: 'alta',
          fecha_creacion: new Date('2026-11-01T09:00:00Z'),
          ordenes_trabajo: [
            {
              id_orden: 'ot-1',
              id_tecnico: 'tec-1',
              fecha_creacion: new Date('2026-11-01T10:00:00Z'),
            },
          ],
          historial_estados: [
            {
              id_historial: 'h-1',
              fecha_creacion: new Date('2026-11-01T09:00:00Z'),
              estado: { id_estado: 1, nombre_estado: 'Reportada' },
            },
            {
              id_historial: 'h-2',
              fecha_creacion: new Date('2026-11-01T14:30:00Z'),
              estado: { id_estado: 3, nombre_estado: 'Resuelta' },
            },
          ],
        },
        {
          id_incidencia: 'inc-2',
          id_activo: 'act-2',
          prioridad: 'media',
          fecha_creacion: new Date('2026-11-02T08:00:00Z'),
          ordenes_trabajo: [
            {
              id_orden: 'ot-anterior',
              id_tecnico: 'tec-1',
              fecha_creacion: new Date('2026-11-02T08:30:00Z'),
            },
            {
              id_orden: 'ot-vigente',
              id_tecnico: 'tec-2',
              fecha_creacion: new Date('2026-11-02T10:00:00Z'),
            },
          ],
          historial_estados: [
            {
              id_historial: 'h-3',
              fecha_creacion: new Date('2026-11-02T08:00:00Z'),
              estado: { id_estado: 1, nombre_estado: 'Reportada' },
            },
            {
              id_historial: 'h-4',
              fecha_creacion: new Date('2026-11-02T12:00:00Z'),
              estado: { id_estado: 3, nombre_estado: 'resuelta' }, // case-insensitive
            },
            {
              id_historial: 'h-5',
              fecha_creacion: new Date('2026-11-02T15:00:00Z'),
              estado: { id_estado: 4, nombre_estado: 'Cerrada' },
            },
          ],
        },
        {
          // Incidencia pendiente (no resuelta, sin ordenes de trabajo)
          id_incidencia: 'inc-3',
          id_activo: 'act-1',
          prioridad: 'baja',
          fecha_creacion: new Date('2026-11-03T10:00:00Z'),
          ordenes_trabajo: [],
          historial_estados: [
            {
              id_historial: 'h-6',
              fecha_creacion: new Date('2026-11-03T10:00:00Z'),
              estado: { id_estado: 1, nombre_estado: 'Reportada' },
            },
          ],
        },
      ];

      const mockPrisma = {
        incidencias: {
          findMany: jest.fn().mockResolvedValue(mockIncidencias),
        },
        $queryRaw: jest.fn().mockResolvedValue([]),
      } as unknown as PrismaService;

      const mockHttp = {
        get: jest.fn().mockReturnValue(of({ data: { datos: [] } })),
      } as unknown as HttpService;

      const statsService = new IncidenciasService(mockPrisma, mockHttp);

      // Espiar y mockear resolutores
      jest.spyOn(statsService as any, 'resolverActivos').mockResolvedValue(
        new Map([
          ['act-1', { nombre: 'Generador Principal' }],
          ['act-2', { nombre: 'Bomba de Agua' }],
        ]),
      );
      jest.spyOn(statsService as any, 'resolverUsuarios').mockResolvedValue(
        new Map([
          ['tec-1', { nombre: 'Carlos', apellido: 'Santana' }],
          ['tec-2', { nombre: 'Maria', apellido: 'Lopez' }],
        ]),
      );

      const resultado = await statsService.obtenerEstadisticasTiempoResolucion('Bearer token');

      // inc-1: 14:30 - 10:00 = 4.5 horas
      // inc-2: 12:00 - 10:00 = 2.0 horas (ot-vigente)
      // promedio = (4.5 + 2.0) / 2 = 3.25
      expect(resultado.totalOrdenesCerradas).toBe(2);
      expect(resultado.promedioHorasTotal).toBe(3.25);

      // Desglose por Técnico
      expect(resultado.desglosePorTecnico).toHaveLength(2);
      const tec1 = resultado.desglosePorTecnico.find((t) => t.id_tecnico === 'tec-1');
      expect(tec1).toEqual({
        id_tecnico: 'tec-1',
        nombre_tecnico: 'Carlos Santana',
        totalOrdenesCerradas: 1,
        promedioHoras: 4.5,
      });
      const tec2 = resultado.desglosePorTecnico.find((t) => t.id_tecnico === 'tec-2');
      expect(tec2).toEqual({
        id_tecnico: 'tec-2',
        nombre_tecnico: 'Maria Lopez',
        totalOrdenesCerradas: 1,
        promedioHoras: 2.0,
      });

      // Desglose por Activo
      expect(resultado.desglosePorActivo).toHaveLength(2);
      const act1 = resultado.desglosePorActivo.find((a) => a.id_activo === 'act-1');
      expect(act1).toEqual({
        id_activo: 'act-1',
        nombre_activo: 'Generador Principal',
        totalOrdenesCerradas: 1,
        promedioHoras: 4.5,
      });

      // Conteos globales
      expect(resultado.conteoPorEstado).toEqual({
        Resuelta: 1,
        Cerrada: 1,
        Reportada: 1,
      });
      expect(resultado.conteoPorPrioridad).toEqual({
        alta: 1,
        media: 1,
        baja: 1,
      });
    });

    it('caso borde: sin órdenes resueltas retorna promedioHorasTotal: 0 sin NaN ni Infinity', async () => {
      const mockIncidencias = [
        {
          id_incidencia: 'inc-1',
          id_activo: 'act-1',
          prioridad: 'baja',
          fecha_creacion: new Date('2026-11-01T10:00:00Z'),
          ordenes_trabajo: [
            {
              id_orden: 'ot-1',
              id_tecnico: 'tec-1',
              fecha_creacion: new Date('2026-11-01T11:00:00Z'),
            },
          ],
          historial_estados: [
            {
              id_historial: 'h-1',
              fecha_creacion: new Date('2026-11-01T10:00:00Z'),
              estado: { id_estado: 1, nombre_estado: 'Reportada' },
            },
            {
              id_historial: 'h-2',
              fecha_creacion: new Date('2026-11-01T11:00:00Z'),
              estado: { id_estado: 2, nombre_estado: 'Asignada' },
            },
          ],
        },
      ];

      const mockPrisma = {
        incidencias: {
          findMany: jest.fn().mockResolvedValue(mockIncidencias),
        },
        $queryRaw: jest.fn().mockResolvedValue([]),
      } as unknown as PrismaService;

      const mockHttp = {
        get: jest.fn().mockReturnValue(of({ data: { datos: [] } })),
      } as unknown as HttpService;

      const statsService = new IncidenciasService(mockPrisma, mockHttp);
      jest.spyOn(statsService as any, 'resolverActivos').mockResolvedValue(new Map());
      jest.spyOn(statsService as any, 'resolverUsuarios').mockResolvedValue(new Map());

      const resultado = await statsService.obtenerEstadisticasTiempoResolucion();

      expect(resultado.totalOrdenesCerradas).toBe(0);
      expect(resultado.promedioHorasTotal).toBe(0);
      expect(Number.isNaN(resultado.promedioHorasTotal)).toBe(false);
      expect(Number.isFinite(resultado.promedioHorasTotal)).toBe(true);
      expect(resultado.desglosePorTecnico).toEqual([]);
      expect(resultado.desglosePorActivo).toEqual([]);
      expect(resultado.conteoPorEstado).toEqual({ Asignada: 1 });
      expect(resultado.conteoPorPrioridad).toEqual({ baja: 1 });
    });

    it('maneja fallback a null cuando resolutores de activos y usuarios no tienen datos', async () => {
      const mockIncidencias = [
        {
          id_incidencia: 'inc-1',
          id_activo: 'act-desconocido',
          prioridad: 'critica',
          fecha_creacion: new Date('2026-11-01T10:00:00Z'),
          ordenes_trabajo: [
            {
              id_orden: 'ot-1',
              id_tecnico: null,
              fecha_creacion: new Date('2026-11-01T10:00:00Z'),
            },
          ],
          historial_estados: [
            {
              id_historial: 'h-1',
              fecha_creacion: new Date('2026-11-01T12:00:00Z'),
              estado: { id_estado: 3, nombre_estado: 'RESUELTA' },
            },
          ],
        },
      ];

      const mockPrisma = {
        incidencias: {
          findMany: jest.fn().mockResolvedValue(mockIncidencias),
        },
        $queryRaw: jest.fn().mockResolvedValue([]),
      } as unknown as PrismaService;

      const mockHttp = {
        get: jest.fn().mockReturnValue(of({ data: { datos: [] } })),
      } as unknown as HttpService;

      const statsService = new IncidenciasService(mockPrisma, mockHttp);
      jest.spyOn(statsService as any, 'resolverActivos').mockResolvedValue(new Map());
      jest.spyOn(statsService as any, 'resolverUsuarios').mockResolvedValue(new Map());

      const resultado = await statsService.obtenerEstadisticasTiempoResolucion();

      expect(resultado.totalOrdenesCerradas).toBe(1);
      expect(resultado.promedioHorasTotal).toBe(2.0);
      expect(resultado.desglosePorTecnico[0].nombre_tecnico).toBeNull();
      expect(resultado.desglosePorActivo[0].nombre_activo).toBeNull();
      expect(resultado.conteoPorPrioridad).toEqual({ critica: 1 });
    });
  });

  describe('TAL-222: Eliminación de aprobación/rechazo de resolución por reportante', () => {
    it('rechaza con BadRequestException transiciones 3 -> 4 (Cerrada) y 3 -> 5 (Rechazada) desde Resuelta', async () => {
      const incidenciaResuelta = {
        ...incidenciaCreada,
        historial_estados: [
          { estado: { id_estado: 3, nombre_estado: 'Resuelta' } },
        ],
      };

      transaction.incidencias.findUnique.mockResolvedValue(incidenciaResuelta);
      transaction.estadoIncidencia.findUnique.mockResolvedValue({
        id_estado: 4,
        nombre_estado: 'Cerrada',
      });

      await expect(
        service.actualizarEstado('incidencia-1', 4, 'reportante-1', 'REPORTANTE'),
      ).rejects.toThrow('retirada');

      transaction.estadoIncidencia.findUnique.mockResolvedValue({
        id_estado: 5,
        nombre_estado: 'Rechazada',
      });

      await expect(
        service.actualizarEstado('incidencia-1', 5, 'reportante-1', 'REPORTANTE'),
      ).rejects.toThrow('retirada');
    });

    it('impone el ciclo estricto de 4 estados (bloquea Reportada -> Resuelta directo, retroceso Asignada -> Reportada y reapertura desde Rechazada)', async () => {
      // 1. Bloquea salto directo Reportada (1) -> Resuelta (3)
      transaction.incidencias.findUnique.mockResolvedValue({
        ...incidenciaCreada,
        historial_estados: [{ estado: { id_estado: 1, nombre_estado: 'Reportada' } }],
      });
      transaction.estadoIncidencia.findUnique.mockResolvedValue({
        id_estado: 3,
        nombre_estado: 'Resuelta',
      });
      await expect(
        service.actualizarEstado('incidencia-1', 3, 'admin-1', 'ADMINISTRADOR'),
      ).rejects.toThrow('Asignada previamente');

      // 2. Bloquea retroceso Asignada (2) -> Reportada (1)
      transaction.incidencias.findUnique.mockResolvedValue({
        ...incidenciaCreada,
        historial_estados: [{ estado: { id_estado: 2, nombre_estado: 'Asignada' } }],
      });
      transaction.estadoIncidencia.findUnique.mockResolvedValue({
        id_estado: 1,
        nombre_estado: 'Reportada',
      });
      await expect(
        service.actualizarEstado('incidencia-1', 1, 'supervisor-1', 'SUPERVISOR'),
      ).rejects.toThrow('retroceder');

      // 3. Bloquea reapertura desde estado terminal Rechazada (5)
      transaction.incidencias.findUnique.mockResolvedValue({
        ...incidenciaCreada,
        historial_estados: [{ estado: { id_estado: 5, nombre_estado: 'Rechazada' } }],
      });
      transaction.estadoIncidencia.findUnique.mockResolvedValue({
        id_estado: 2,
        nombre_estado: 'Asignada',
      });
      await expect(
        service.actualizarEstado('incidencia-1', 2, 'supervisor-1', 'SUPERVISOR'),
      ).rejects.toThrow('estado terminal Rechazada');
    });
  });
});