import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrioridadDinamicaService } from './prioridad-dinamica.service';
import { RabbitmqProducerService } from '../rabbitmq/rabbitmq-producer.service';
import { PrioridadDinamicaEscaladaEvento } from '../rabbitmq/interfaces/incidencia-evento.interface';

export interface ResultadoEvaluacionPrioridades {
  evaluadas: number;
  escaladas_detectadas: number;
  notificaciones_emitidas: number;
  duplicados_omitidos: number;
  eventos_emitidos: PrioridadDinamicaEscaladaEvento[];
}

const ORDEN_PRIORIDAD: Record<string, number> = {
  baja: 0,
  media: 1,
  alta: 2,
  critica: 3,
};

@Injectable()
export class PrioridadDinamicaMonitorService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrioridadDinamicaMonitorService.name);
  private readonly ultimaPrioridadNotificada = new Map<string, string>();
  private timer: NodeJS.Timeout | null = null;
  private ejecutando = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly prioridadDinamicaService: PrioridadDinamicaService,
    @Optional()
    private readonly rabbitmqProducer?: RabbitmqProducerService,
  ) {}

  onModuleInit() {
    if (
      process.env.NODE_ENV === 'test' ||
      process.env.PRIORIDAD_DINAMICA_MONITOR_ENABLED === 'false'
    ) {
      return;
    }

    const intervalMs = Math.max(
      10_000,
      Number(process.env.PRIORIDAD_DINAMICA_INTERVAL_MS || 15 * 60 * 1000),
    );

    this.timer = setInterval(() => {
      void this.evaluarYNotificarCambiosPrioridad().catch((err) => {
        this.logger.warn(
          `[PRIORIDAD_DINAMICA] Error en ciclo periódico de evaluación: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
    }, intervalMs);

    if (typeof this.timer.unref === 'function') {
      this.timer.unref();
    }
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  limpiarHistorialNotificaciones() {
    this.ultimaPrioridadNotificada.clear();
  }

  private clavePrioridad(prioridad: string): string {
    return String(prioridad || 'media')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  /**
   * Evalúa las incidencias abiertas y publica eventos en RabbitMQ (exchange `uct.activos.events`)
   * únicamente cuando ocurre un cambio efectivo de prioridad por antigüedad, evitando duplicados.
   */
  async evaluarYNotificarCambiosPrioridad(
    opciones: {
      fechaActual?: Date;
      excluirFinesDeSemana?: boolean;
    } = {},
  ): Promise<ResultadoEvaluacionPrioridades> {
    if (this.ejecutando) {
      return {
        evaluadas: 0,
        escaladas_detectadas: 0,
        notificaciones_emitidas: 0,
        duplicados_omitidos: 0,
        eventos_emitidos: [],
      };
    }

    this.ejecutando = true;
    const eventosEmitidos: PrioridadDinamicaEscaladaEvento[] = [];
    let escaladasDetectadas = 0;
    let duplicadosOmitidos = 0;

    try {
      const incidencias = await this.prisma.incidencias.findMany({
        include: {
          historial_estados: {
            orderBy: [{ fecha_creacion: 'desc' }, { id_historial: 'desc' }],
            take: 1,
            include: {
              estado: { select: { id_estado: true, nombre_estado: true } },
            },
          },
          ordenes_trabajo: {
            orderBy: [{ fecha_creacion: 'desc' }, { id_orden: 'desc' }],
            take: 1,
          },
        },
      });

      const idsActivos = new Set<string>();

      for (const inc of incidencias) {
        const calculo = this.prioridadDinamicaService.calcularPrioridadRelativa(
          inc,
          opciones,
        );

        const estaActiva = this.prioridadDinamicaService.esEstadoInactivo(
          calculo.estado_actual,
        );
        if (!estaActiva) {
          this.ultimaPrioridadNotificada.delete(inc.id_incidencia);
          continue;
        }

        idsActivos.add(inc.id_incidencia);

        const claveBase = this.clavePrioridad(calculo.prioridad_original);
        const claveNueva = this.clavePrioridad(calculo.prioridad_relativa);
        const claveAnteriorNotificada = this.ultimaPrioridadNotificada.get(
          inc.id_incidencia,
        );
        const claveReferencia = claveAnteriorNotificada ?? claveBase;

        // Solo existe cambio efectivo si está escalada y el nivel relativo supera el nivel previo conocido
        const nivelReferencia = ORDEN_PRIORIDAD[claveReferencia] ?? 1;
        const nivelNuevo = ORDEN_PRIORIDAD[claveNueva] ?? 1;

        if (!calculo.escalada) {
          continue;
        }

        if (nivelNuevo <= nivelReferencia) {
          if (claveAnteriorNotificada && claveNueva === claveAnteriorNotificada) {
            duplicadosOmitidos++;
          }
          continue;
        }

        escaladasDetectadas++;

        const prioridadAnteriorLabel = claveAnteriorNotificada
          ? this.prioridadDinamicaService.normalizarPrioridad(
              claveAnteriorNotificada,
            )
          : calculo.prioridad_original;

        const evento: PrioridadDinamicaEscaladaEvento = {
          evento: 'PRIORIDAD_DINAMICA_ESCALADA',
          id_incidencia: inc.id_incidencia,
          id_activo: inc.id_activo,
          titulo: inc.titulo,
          estado_actual: calculo.estado_actual,
          prioridad_anterior: prioridadAnteriorLabel,
          prioridad_nueva: calculo.prioridad_relativa,
          tiempo_inactividad_horas: calculo.tiempo_inactividad_horas,
          antiguedad_dias: calculo.antiguedad_dias,
          motivo_escalamiento:
            calculo.motivo_escalamiento ||
            'Prioridad escalada automáticamente por antigüedad.',
          id_tecnico: inc.ordenes_trabajo?.[0]?.id_tecnico ?? null,
          timestamp: (opciones.fechaActual ?? new Date()).toISOString(),
        };

        const publicado = this.rabbitmqProducer
          ? await this.rabbitmqProducer.emitirCambioPrioridadDinamica(evento)
          : false;

        if (publicado) {
          this.ultimaPrioridadNotificada.set(inc.id_incidencia, claveNueva);
          eventosEmitidos.push(evento);
        }
      }

      // Depurar entradas obsoletas de incidencias ya inexistentes
      for (const idRegistrado of Array.from(this.ultimaPrioridadNotificada.keys())) {
        if (!idsActivos.has(idRegistrado)) {
          this.ultimaPrioridadNotificada.delete(idRegistrado);
        }
      }

      return {
        evaluadas: incidencias.length,
        escaladas_detectadas: escaladasDetectadas,
        notificaciones_emitidas: eventosEmitidos.length,
        duplicados_omitidos: duplicadosOmitidos,
        eventos_emitidos: eventosEmitidos,
      };
    } finally {
      this.ejecutando = false;
    }
  }
}
