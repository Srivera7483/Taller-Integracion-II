import { Injectable, Logger } from '@nestjs/common';
import {
  CalculoPrioridadResultado,
  ReportePrioridadesDinamicas,
} from './interfaces/prioridad-dinamica.interface';
import { PrioridadDinamicaQueryDto } from './dto/prioridad-dinamica-query.dto';

@Injectable()
export class PrioridadDinamicaService {
  private readonly logger = new Logger(PrioridadDinamicaService.name);

  private readonly ESCALA_PRIORIDADES: string[] = ['Baja', 'Media', 'Alta', 'Crítica'];

  private readonly ESTADOS_TERMINALES: string[] = [
    'RESUELTA',
    'CERRADA',
    'RECHAZADA',
    'COMPLETADA',
  ];

  /**
   * Normaliza la prioridad base a uno de los valores válidos del sistema.
   * Por defecto se asume 'Media' para incidencias nuevas sin clasificar.
   */
  normalizarPrioridad(prioridadRaw?: string | null): string {
    if (!prioridadRaw || typeof prioridadRaw !== 'string') {
      return 'Media';
    }

    const norm = prioridadRaw.trim().toLowerCase();
    if (norm === 'baja') return 'Baja';
    if (norm === 'media') return 'Media';
    if (norm === 'alta') return 'Alta';
    if (norm === 'critica' || norm === 'crítica') return 'Crítica';

    return 'Media';
  }

  /**
   * Determina si un estado es considerado inactivo/pendiente de atención.
   */
  esEstadoInactivo(nombreEstado?: string | null): boolean {
    if (!nombreEstado) return true;
    const norm = nombreEstado.trim().toUpperCase();
    return !this.ESTADOS_TERMINALES.includes(norm);
  }

  /**
   * Calcula las horas transcurridas entre dos fechas.
   * Si excluirFinesDeSemana es true, descuenta sábados y domingos.
   */
  calcularHorasInactividad(
    fechaInicio: Date,
    fechaFin: Date = new Date(),
    excluirFinesDeSemana = false,
  ): number {
    const inicioMs = fechaInicio.getTime();
    const finMs = fechaFin.getTime();

    if (finMs <= inicioMs) return 0;

    if (!excluirFinesDeSemana) {
      return Math.floor((finMs - inicioMs) / (1000 * 60 * 60));
    }

    // Cálculo excluyendo fines de semana (sábado = 6, domingo = 0)
    let horasHabiles = 0;
    const cursor = new Date(inicioMs);

    while (cursor.getTime() < finMs) {
      const diaSemana = cursor.getUTCDay();
      const esFinDeSemana = diaSemana === 0 || diaSemana === 6;

      if (!esFinDeSemana) {
        horasHabiles++;
      }

      // Avanzar una hora
      cursor.setUTCHours(cursor.getUTCHours() + 1);
    }

    return horasHabiles;
  }

  /**
   * Escala la prioridad base n niveles en la jerarquía: Baja -> Media -> Alta -> Crítica.
   */
  escalarNivel(prioridadBase: string, niveles = 1): string {
    const normalizada = this.normalizarPrioridad(prioridadBase);
    const indexActual = this.ESCALA_PRIORIDADES.findIndex(
      (p) => p.toLowerCase() === normalizada.toLowerCase(),
    );

    if (indexActual === -1) return 'Media';

    const nuevoIndex = Math.min(
      this.ESCALA_PRIORIDADES.length - 1,
      indexActual + niveles,
    );

    return this.ESCALA_PRIORIDADES[nuevoIndex];
  }

  /**
   * Calcula la prioridad relativa dinámica de una incidencia según su antigüedad.
   * Si lleva más de 48 horas inactiva/sin resolver, se marca como 'escalada' y sube de prioridad.
   */
  calcularPrioridadRelativa(
    incidencia: {
      fecha_creacion: Date | string;
      prioridad?: string | null;
      ordenes_trabajo?: any[];
      historial_estados?: any[];
      estado?: any;
      [key: string]: any;
    },
    opciones: {
      fechaActual?: Date;
      excluirFinesDeSemana?: boolean;
    } = {},
  ): CalculoPrioridadResultado {
    const fechaActual = opciones.fechaActual ?? new Date();
    const fechaCreacion =
      incidencia.fecha_creacion instanceof Date
        ? incidencia.fecha_creacion
        : new Date(incidencia.fecha_creacion);

    // Obtener nombre del estado actual
    let nombreEstado = 'Reportada';
    if (typeof incidencia.estado === 'string') {
      nombreEstado = incidencia.estado;
    } else if (incidencia.estado?.nombre_estado) {
      nombreEstado = incidencia.estado.nombre_estado;
    } else if (incidencia.historial_estados?.[0]?.estado?.nombre_estado) {
      nombreEstado = incidencia.historial_estados[0].estado.nombre_estado;
    }

    // Obtener prioridad base (si la orden o incidencia tiene una explícita)
    const prioridadExplicita =
      incidencia.prioridad ||
      incidencia.ordenes_trabajo?.[0]?.prioridad ||
      'Media';
    const prioridadOriginal = this.normalizarPrioridad(prioridadExplicita);

    const horasInactividad = this.calcularHorasInactividad(
      fechaCreacion,
      fechaActual,
      Boolean(opciones.excluirFinesDeSemana),
    );
    const antiguedadDias = Math.floor(horasInactividad / 24);

    const estaInactiva = this.esEstadoInactivo(nombreEstado);

    // Regla de negocio TAL-115:
    // Más de 48 horas (2 días) en estado de inactividad activa el flag "escalada".
    const esEscalada = estaInactiva && horasInactividad >= 48;

    let prioridadRelativa = prioridadOriginal;
    let motivoEscalamiento: string | null = null;

    if (esEscalada) {
      if (horasInactividad >= 96) {
        // Más de 4 días (96 horas): escalamiento crítico de 2 niveles
        prioridadRelativa = this.escalarNivel(prioridadOriginal, 2);
        motivoEscalamiento = `Inactividad crítica acumulada de ${horasInactividad}h (${antiguedadDias} días) sin resolución. Prioridad escalada en 2 niveles.`;
      } else {
        // Entre 48h y 96h: escalamiento de 1 nivel
        prioridadRelativa = this.escalarNivel(prioridadOriginal, 1);
        motivoEscalamiento = `Inactividad superior a 48h (${horasInactividad}h acumuladas en backlog). Prioridad escalada automáticamente.`;
      }
    }

    return {
      prioridad_original: prioridadOriginal,
      prioridad_relativa: prioridadRelativa,
      escalada: esEscalada,
      tiempo_inactividad_horas: horasInactividad,
      antiguedad_dias: antiguedadDias,
      estado_actual: nombreEstado,
      motivo_escalamiento: motivoEscalamiento,
    };
  }

  /**
   * Genera el reporte consolidado de prioridades dinámicas para un conjunto de incidencias.
   */
  generarReporte(
    incidencias: any[],
    query?: PrioridadDinamicaQueryDto,
    opcionesExtra?: { fechaActual?: Date },
  ): ReportePrioridadesDinamicas {
    const soloEscaladas = Boolean(query?.solo_escaladas);
    const excluirFinesDeSemana = Boolean(query?.excluir_fines_de_semana);
    const fechaActual = opcionesExtra?.fechaActual;

    let evaluadas = incidencias.map((inc) => {
      const calculo = this.calcularPrioridadRelativa(inc, {
        excluirFinesDeSemana,
        fechaActual,
      });
      return {
        id_incidencia: inc.id_incidencia,
        titulo: inc.titulo,
        id_activo: inc.id_activo,
        estado: calculo.estado_actual,
        fecha_creacion:
          inc.fecha_creacion instanceof Date
            ? inc.fecha_creacion
            : new Date(inc.fecha_creacion),
        prioridad_original: calculo.prioridad_original,
        prioridad_relativa: calculo.prioridad_relativa,
        escalada: calculo.escalada,
        tiempo_inactividad_horas: calculo.tiempo_inactividad_horas,
        antiguedad_dias: calculo.antiguedad_dias,
        motivo_escalamiento: calculo.motivo_escalamiento,
      };
    });

    const totalEvaluadas = evaluadas.length;
    const totalEscaladas = evaluadas.filter((i) => i.escalada).length;
    const tasaEscalamiento =
      totalEvaluadas > 0
        ? Math.round((totalEscaladas / totalEvaluadas) * 10000) / 100
        : 0;

    const porPrioridad: Record<string, number> = {
      Baja: 0,
      Media: 0,
      Alta: 0,
      Crítica: 0,
    };

    for (const item of evaluadas) {
      const key = item.prioridad_relativa;
      porPrioridad[key] = (porPrioridad[key] || 0) + 1;
    }

    if (soloEscaladas) {
      evaluadas = evaluadas.filter((i) => i.escalada);
    }

    // Paginación opcional
    const limit = query?.limit ?? query?.limite ?? 20;
    const page = query?.page ?? query?.pagina ?? 1;
    const offset = (page - 1) * limit;
    const paginadas = evaluadas.slice(offset, offset + limit);

    return {
      valido: true,
      resumen: {
        total_evaluadas: totalEvaluadas,
        total_escaladas: totalEscaladas,
        tasa_escalamiento: tasaEscalamiento,
        por_prioridad_relativa: porPrioridad,
      },
      incidencias: paginadas,
    };
  }
}
