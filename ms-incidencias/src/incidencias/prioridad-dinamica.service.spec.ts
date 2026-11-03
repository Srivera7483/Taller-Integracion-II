import { PrioridadDinamicaService } from './prioridad-dinamica.service';

describe('PrioridadDinamicaService - TAL-115: Cálculo de Prioridad Dinámica por Antigüedad', () => {
  let service: PrioridadDinamicaService;

  beforeEach(() => {
    service = new PrioridadDinamicaService();
  });

  describe('Criterio de Aceptación 1: Flag de Escalada e Inactividad (> 48h / 2 días)', () => {
    it('no marca como escalada una incidencia reciente con menos de 48 horas', () => {
      const fechaCreacion = new Date('2026-10-10T12:00:00Z');
      const fechaActual = new Date('2026-10-11T12:00:00Z'); // 24 horas

      const resultado = service.calcularPrioridadRelativa(
        {
          fecha_creacion: fechaCreacion,
          estado: 'Reportada',
          prioridad: 'Media',
        },
        { fechaActual },
      );

      expect(resultado.escalada).toBe(false);
      expect(resultado.tiempo_inactividad_horas).toBe(24);
      expect(resultado.antiguedad_dias).toBe(1);
      expect(resultado.prioridad_relativa).toBe('Media');
      expect(resultado.motivo_escalamiento).toBeNull();
    });

    it('marca con flag escalada=true una incidencia con más de 48 horas en estado inactivo', () => {
      const fechaCreacion = new Date('2026-10-10T12:00:00Z');
      const fechaActual = new Date('2026-10-12T13:00:00Z'); // 49 horas (> 2 días)

      const resultado = service.calcularPrioridadRelativa(
        {
          fecha_creacion: fechaCreacion,
          estado: 'Reportada',
          prioridad: 'Baja',
        },
        { fechaActual },
      );

      expect(resultado.escalada).toBe(true);
      expect(resultado.tiempo_inactividad_horas).toBe(49);
      expect(resultado.antiguedad_dias).toBe(2);
      expect(resultado.prioridad_original).toBe('Baja');
      expect(resultado.prioridad_relativa).toBe('Media'); // Sube 1 nivel
      expect(resultado.motivo_escalamiento).toContain('Inactividad superior a 48h');
    });

    it('no escala incidencias que ya se encuentran en estado terminal (Resuelta/Cerrada)', () => {
      const fechaCreacion = new Date('2026-10-01T12:00:00Z');
      const fechaActual = new Date('2026-10-10T12:00:00Z'); // 9 días

      const resultado = service.calcularPrioridadRelativa(
        {
          fecha_creacion: fechaCreacion,
          estado: 'Resuelta',
          prioridad: 'Media',
        },
        { fechaActual },
      );

      expect(resultado.escalada).toBe(false);
      expect(resultado.prioridad_relativa).toBe('Media');
      expect(resultado.motivo_escalamiento).toBeNull();
    });
  });

  describe('Criterio de Aceptación 2: Reglas de Aumento Automático de Nivel', () => {
    it('escala de Baja a Media tras 48 horas', () => {
      const fechaCreacion = new Date('2026-10-10T00:00:00Z');
      const fechaActual = new Date('2026-10-12T02:00:00Z'); // 50 horas

      const resultado = service.calcularPrioridadRelativa(
        {
          fecha_creacion: fechaCreacion,
          estado: 'Reportada',
          prioridad: 'Baja',
        },
        { fechaActual },
      );

      expect(resultado.escalada).toBe(true);
      expect(resultado.prioridad_original).toBe('Baja');
      expect(resultado.prioridad_relativa).toBe('Media');
    });

    it('escala de Media a Alta tras 48 horas', () => {
      const fechaCreacion = new Date('2026-10-10T00:00:00Z');
      const fechaActual = new Date('2026-10-12T02:00:00Z'); // 50 horas

      const resultado = service.calcularPrioridadRelativa(
        {
          fecha_creacion: fechaCreacion,
          estado: 'Reportada',
          prioridad: 'Media',
        },
        { fechaActual },
      );

      expect(resultado.escalada).toBe(true);
      expect(resultado.prioridad_original).toBe('Media');
      expect(resultado.prioridad_relativa).toBe('Alta');
    });

    it('escala de Alta a Crítica tras 48 horas', () => {
      const fechaCreacion = new Date('2026-10-10T00:00:00Z');
      const fechaActual = new Date('2026-10-12T02:00:00Z'); // 50 horas

      const resultado = service.calcularPrioridadRelativa(
        {
          fecha_creacion: fechaCreacion,
          estado: 'Pendiente',
          prioridad: 'Alta',
        },
        { fechaActual },
      );

      expect(resultado.escalada).toBe(true);
      expect(resultado.prioridad_original).toBe('Alta');
      expect(resultado.prioridad_relativa).toBe('Crítica');
    });

    it('escala 2 niveles ante inactividad crítica superior a 96 horas (4 días)', () => {
      const fechaCreacion = new Date('2026-10-01T00:00:00Z');
      const fechaActual = new Date('2026-10-05T06:00:00Z'); // 102 horas (> 4 días)

      const resultado = service.calcularPrioridadRelativa(
        {
          fecha_creacion: fechaCreacion,
          estado: 'Reportada',
          prioridad: 'Media',
        },
        { fechaActual },
      );

      expect(resultado.escalada).toBe(true);
      expect(resultado.prioridad_original).toBe('Media');
      expect(resultado.prioridad_relativa).toBe('Crítica'); // Media -> Alta -> Crítica
      expect(resultado.motivo_escalamiento).toContain('Inactividad crítica acumulada');
    });
  });

  describe('Criterio de Aceptación 3: Manejo de Fines de Semana vs Tiempo Absoluto', () => {
    it('calcula tiempo absoluto por defecto', () => {
      // Viernes 10:00 a Lunes 10:00 = 72 horas totales
      const viernes = new Date('2026-10-09T10:00:00Z');
      const lunes = new Date('2026-10-12T10:00:00Z');

      const horas = service.calcularHorasInactividad(viernes, lunes, false);
      expect(horas).toBe(72);
    });

    it('descuenta fines de semana cuando excluirFinesDeSemana=true', () => {
      // Viernes 10:00 a Lunes 10:00 excluyendo sábado y domingo = 24 horas hábiles
      const viernes = new Date('2026-10-09T10:00:00Z');
      const lunes = new Date('2026-10-12T10:00:00Z');

      const horas = service.calcularHorasInactividad(viernes, lunes, true);
      expect(horas).toBe(24);
    });
  });

  describe('Reporte Consolidado de Prioridades Dinámicas', () => {
    it('genera el resumen estadístico con tasas y conteos correctos', () => {
      const ahora = new Date('2026-10-15T12:00:00Z');
      const incidencias = [
        // Incidencia 1: creada hace 10h (reciente, no escalada, prioridad Media)
        {
          id_incidencia: 'inc-1',
          titulo: 'Problema leve',
          id_activo: 'act-1',
          estado: 'Reportada',
          prioridad: 'Baja',
          fecha_creacion: new Date('2026-10-15T02:00:00Z'),
        },
        // Incidencia 2: creada hace 60h (> 48h, escalada: Media -> Alta)
        {
          id_incidencia: 'inc-2',
          titulo: 'Falla persistente',
          id_activo: 'act-2',
          estado: 'Reportada',
          prioridad: 'Media',
          fecha_creacion: new Date('2026-10-13T00:00:00Z'),
        },
        // Incidencia 3: creada hace 120h (> 96h, escalada: Alta -> Crítica)
        {
          id_incidencia: 'inc-3',
          titulo: 'Servidor caído',
          id_activo: 'act-3',
          estado: 'Pendiente',
          prioridad: 'Alta',
          fecha_creacion: new Date('2026-10-10T12:00:00Z'),
        },
      ];

      const reporte = service.generarReporte(incidencias, undefined, {
        fechaActual: ahora,
      });

      expect(reporte.valido).toBe(true);
      expect(reporte.resumen.total_evaluadas).toBe(3);
      expect(reporte.resumen.total_escaladas).toBe(2);
      expect(reporte.resumen.tasa_escalamiento).toBe(66.67);
      expect(reporte.resumen.por_prioridad_relativa.Baja).toBe(1);
      expect(reporte.resumen.por_prioridad_relativa.Alta).toBe(1);
      expect(reporte.resumen.por_prioridad_relativa.Crítica).toBe(1);
    });

    it('permite filtrar el reporte solo con incidencias escaladas', () => {
      const incidencias = [
        {
          id_incidencia: 'inc-1',
          titulo: 'Reciente',
          id_activo: 'act-1',
          estado: 'Reportada',
          prioridad: 'Baja',
          fecha_creacion: new Date(),
        },
        {
          id_incidencia: 'inc-2',
          titulo: 'Antigua',
          id_activo: 'act-2',
          estado: 'Reportada',
          prioridad: 'Media',
          fecha_creacion: new Date('2026-09-01T00:00:00Z'),
        },
      ];

      const reporte = service.generarReporte(incidencias, { solo_escaladas: true });

      expect(reporte.incidencias.length).toBe(1);
      expect(reporte.incidencias[0].id_incidencia).toBe('inc-2');
      expect(reporte.incidencias[0].escalada).toBe(true);
    });
  });
});
