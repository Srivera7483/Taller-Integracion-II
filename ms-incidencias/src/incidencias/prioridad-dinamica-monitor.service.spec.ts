import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { PrioridadDinamicaService } from './prioridad-dinamica.service';
import { PrioridadDinamicaMonitorService } from './prioridad-dinamica-monitor.service';

describe('PrioridadDinamicaMonitorService (TAL-222)', () => {
  let monitor: PrioridadDinamicaMonitorService;
  let prioridadService: PrioridadDinamicaService;
  let prismaMock: any;
  let rabbitmqMock: any;

  beforeEach(() => {
    prioridadService = new PrioridadDinamicaService();
    prismaMock = {
      incidencias: {
        findMany: jest.fn(),
      },
    };
    rabbitmqMock = {
      emitirCambioPrioridadDinamica: jest.fn<any>().mockResolvedValue(true),
    };
    monitor = new PrioridadDinamicaMonitorService(
      prismaMock,
      prioridadService,
      rabbitmqMock,
    );
  });

  it('emite notificación en RabbitMQ ante escalamiento efectivo (Media -> Alta tras 48h) y evita duplicados', async () => {
    const fechaCreacion = new Date('2026-11-20T10:00:00Z');
    prismaMock.incidencias.findMany.mockResolvedValue([
      {
        id_incidencia: 'inc-48h',
        id_activo: 'act-1',
        titulo: 'Switch sin enlace',
        prioridad: 'media',
        fecha_creacion: fechaCreacion,
        historial_estados: [
          { estado: { id_estado: 1, nombre_estado: 'Reportada' } },
        ],
        ordenes_trabajo: [],
      },
    ]);

    const t50h = new Date('2026-11-22T12:00:00Z');
    const primera = await monitor.evaluarYNotificarCambiosPrioridad({
      fechaActual: t50h,
    });

    expect(primera.notificaciones_emitidas).toBe(1);
    expect(primera.duplicados_omitidos).toBe(0);
    expect(rabbitmqMock.emitirCambioPrioridadDinamica).toHaveBeenCalledTimes(1);
    expect(rabbitmqMock.emitirCambioPrioridadDinamica).toHaveBeenCalledWith(
      expect.objectContaining({
        evento: 'PRIORIDAD_DINAMICA_ESCALADA',
        id_incidencia: 'inc-48h',
        prioridad_anterior: 'Media',
        prioridad_nueva: 'Alta',
      }),
    );

    // Segunda evaluación a las 52h: sigue en 'Alta', NO debe duplicar notificación
    const t52h = new Date('2026-11-22T14:00:00Z');
    const segunda = await monitor.evaluarYNotificarCambiosPrioridad({
      fechaActual: t52h,
    });

    expect(segunda.notificaciones_emitidas).toBe(0);
    expect(segunda.duplicados_omitidos).toBe(1);
    expect(rabbitmqMock.emitirCambioPrioridadDinamica).toHaveBeenCalledTimes(1);

    // Tercera evaluación a las 100h: escala de 'Alta' -> 'Crítica', SÍ emite nuevo evento
    const t100h = new Date('2026-11-24T14:00:00Z');
    const tercera = await monitor.evaluarYNotificarCambiosPrioridad({
      fechaActual: t100h,
    });

    expect(tercera.notificaciones_emitidas).toBe(1);
    expect(rabbitmqMock.emitirCambioPrioridadDinamica).toHaveBeenCalledTimes(2);
    expect(rabbitmqMock.emitirCambioPrioridadDinamica).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id_incidencia: 'inc-48h',
        prioridad_anterior: 'Alta',
        prioridad_nueva: 'Crítica',
      }),
    );
  });

  it('NO emite eventos para incidencias ya en Crítica, menores a 48h o en estado terminal', async () => {
    const fechaAntigua = new Date('2026-11-18T10:00:00Z');
    const fechaReciente = new Date('2026-11-22T00:00:00Z');
    const ahora = new Date('2026-11-22T12:00:00Z');

    prismaMock.incidencias.findMany.mockResolvedValue([
      {
        id_incidencia: 'inc-ya-critica',
        id_activo: 'act-1',
        titulo: 'Corte total',
        prioridad: 'critica',
        fecha_creacion: fechaAntigua,
        historial_estados: [{ estado: { id_estado: 1, nombre_estado: 'Reportada' } }],
        ordenes_trabajo: [],
      },
      {
        id_incidencia: 'inc-resuelta',
        id_activo: 'act-2',
        titulo: 'Proyector reparado',
        prioridad: 'baja',
        fecha_creacion: fechaAntigua,
        historial_estados: [{ estado: { id_estado: 3, nombre_estado: 'Resuelta' } }],
        ordenes_trabajo: [],
      },
      {
        id_incidencia: 'inc-nueva',
        id_activo: 'act-3',
        titulo: 'Mouse suelto',
        prioridad: 'baja',
        fecha_creacion: fechaReciente,
        historial_estados: [{ estado: { id_estado: 1, nombre_estado: 'Reportada' } }],
        ordenes_trabajo: [],
      },
    ]);

    const res = await monitor.evaluarYNotificarCambiosPrioridad({
      fechaActual: ahora,
    });

    expect(res.notificaciones_emitidas).toBe(0);
    expect(rabbitmqMock.emitirCambioPrioridadDinamica).not.toHaveBeenCalled();
  });

  it('reintenta en el siguiente ciclo si RabbitMQ falla en la publicación inicial', async () => {
    const fechaCreacion = new Date('2026-11-20T10:00:00Z');
    prismaMock.incidencias.findMany.mockResolvedValue([
      {
        id_incidencia: 'inc-retry',
        id_activo: 'act-1',
        titulo: 'Falla UPS',
        prioridad: 'baja',
        fecha_creacion: fechaCreacion,
        historial_estados: [{ estado: { id_estado: 2, nombre_estado: 'Asignada' } }],
        ordenes_trabajo: [{ id_tecnico: 'tec-1' }],
      },
    ]);

    rabbitmqMock.emitirCambioPrioridadDinamica
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const ahora = new Date('2026-11-22T12:00:00Z');
    const r1 = await monitor.evaluarYNotificarCambiosPrioridad({ fechaActual: ahora });
    expect(r1.notificaciones_emitidas).toBe(0);

    const r2 = await monitor.evaluarYNotificarCambiosPrioridad({ fechaActual: ahora });
    expect(r2.notificaciones_emitidas).toBe(1);
    expect(rabbitmqMock.emitirCambioPrioridadDinamica).toHaveBeenCalledTimes(2);
  });
});
