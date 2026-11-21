import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IncidenciaCriticaMailData,
  IncidenciaResueltaMailData,
  MailSendResult,
  MailService,
  MantenimientoPreventivoMailData,
  OrdenAsignadaMailData,
} from '../mail/mail.service';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';
import {
  NotificacionEventoDto,
  PrioridadNotificacion,
} from '../rabbitmq/dto/notificacion-evento.dto';

export type EstadoNotificacion = 'ENVIADO' | 'SIMULADO' | 'FALLIDO';

export type TipoEventoNotificacion =
  | 'INCIDENCIA_CRITICA'
  | 'ORDEN_ASIGNADA'
  | 'INCIDENCIA_RESUELTA'
  | 'INCIDENCIA_ACTUALIZADA'
  | 'MANTENIMIENTO_PREVENTIVO'
  | 'GENERAL';

export interface EnvioNotificacionResult {
  status: 'enviada' | 'fallida';
  idNotificacion?: string;
  error?: string;
  fallback: boolean;
  transient: boolean;
}

export interface NotificacionLogEstructurado {
  correlationId: string;
  evento: TipoEventoNotificacion;
  destinatario: string;
  asunto: string;
  estado: EstadoNotificacion;
  intentos?: number;
  messageId?: string;
  error?: string;
  timestamp: string;
}

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Endpoint REST: Encola y despacha un correo directo
   */
  async notificar(
    payload: CreateNotificacionDto,
  ): Promise<EnvioNotificacionResult> {
    const correlationId = crypto.randomUUID();
    this.logger.log(
      `[REST] Despachando notificación directa (correlationId: ${correlationId}) a: ${payload.email}`,
    );

    const destinatario = this.validarEmail(payload.email);
    if (!destinatario) {
      const errorMsg = `Formato de correo destinatario inválido: '${payload.email}'.`;
      this.registrarLogEstructurado({
        correlationId,
        evento: 'GENERAL',
        destinatario: payload.email || 'SIN_DESTINATARIO',
        asunto: payload.asunto,
        estado: 'FALLIDO',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
      return {
        status: 'fallida',
        error: errorMsg,
        fallback: false,
        transient: false,
      };
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #1e3a8a;">${payload.asunto}</h2>
        <p style="font-size: 15px; line-height: 1.6;">${payload.cuerpoMensaje}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 24px;" />
        <small style="color: #64748b;">InfraManager - Plataforma Institucional</small>
      </div>
    `;

    const sendResult = await this.mailService.enviarCorreo({
      to: destinatario,
      subject: payload.asunto,
      html: htmlContent,
      text: payload.cuerpoMensaje,
    });

    const estadoFinal: EstadoNotificacion = !sendResult.success
      ? 'FALLIDO'
      : sendResult.isFallback
        ? 'SIMULADO'
        : 'ENVIADO';

    this.registrarLogEstructurado({
      correlationId,
      evento: 'GENERAL',
      destinatario,
      asunto: payload.asunto,
      estado: estadoFinal,
      messageId: sendResult.messageId,
      error: sendResult.error,
      timestamp: new Date().toISOString(),
    });

    return {
      status: sendResult.success ? 'enviada' : 'fallida',
      idNotificacion: correlationId,
      error: sendResult.error,
      fallback: sendResult.isFallback,
      transient: !sendResult.success ? this.determinarSiErrorEsTransitorio(sendResult.error) : false,
    };
  }

  /**
   * Caso 1: Incidencia Crítica Reportada (ms-incidencias)
   */
  async procesarIncidenciaCritica(evento: any): Promise<EnvioNotificacionResult> {
    const idIncidencia = String(
      evento.id_incidencia ?? evento.idIncidencia ?? 'sin-id',
    );
    const correlationId = this.obtenerCorrelationId(evento, idIncidencia);
    const titulo = String(evento.titulo ?? 'Incidencia Crítica Sin Título');
    const descripcion = String(
      evento.descripcion ?? 'Sin descripción detallada.',
    );

    const destinatario = this.obtenerDestinatario(
      evento,
      ['emailDestinatario', 'email', 'destinatario'],
      this.configService.get<string>('MAIL_ALERTAS_CRITICAS'),
    );

    if (!destinatario) {
      const errorMsg = `No se especificó un correo destinatario real para la incidencia crítica #${idIncidencia} (campo email ausente y MAIL_ALERTAS_CRITICAS no configurado). Se cancela el envío para evitar destinatarios ficticios.`;
      this.registrarLogEstructurado({
        correlationId,
        evento: 'INCIDENCIA_CRITICA',
        destinatario: 'NO_ESPECIFICADO',
        asunto: `[ALERTA CRÍTICA] Incidencia #${idIncidencia.slice(0, 8)}: ${titulo}`,
        estado: 'FALLIDO',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
      return {
        status: 'fallida',
        idNotificacion: correlationId,
        error: errorMsg,
        fallback: false,
        transient: false,
      };
    }

    this.logger.warn(
      `[CRÍTICA] Despachando alerta por correo para incidencia #${idIncidencia} a: ${destinatario}`,
    );

    const mailData: IncidenciaCriticaMailData = {
      idIncidencia,
      titulo,
      descripcion,
      ubicacion: evento.ubicacion ?? evento.aulaOEdificio ?? evento.id_edificio,
      prioridad: 'CRITICA',
      reportante: evento.id_reportante ?? evento.reportante,
      fecha: evento.fecha_creacion ?? new Date().toISOString(),
    };

    const sendResult = await this.mailService.enviarNotificacionIncidenciaCritica(
      destinatario,
      mailData,
    );

    const estadoFinal: EstadoNotificacion = !sendResult.success
      ? 'FALLIDO'
      : sendResult.isFallback
        ? 'SIMULADO'
        : 'ENVIADO';

    this.registrarLogEstructurado({
      correlationId,
      evento: 'INCIDENCIA_CRITICA',
      destinatario,
      asunto: `[ALERTA CRÍTICA] Incidencia #${idIncidencia.slice(0, 8)}: ${titulo}`,
      estado: estadoFinal,
      messageId: sendResult.messageId,
      error: sendResult.error,
      timestamp: new Date().toISOString(),
    });

    return {
      status: sendResult.success ? 'enviada' : 'fallida',
      idNotificacion: correlationId,
      error: sendResult.error,
      fallback: sendResult.isFallback,
      transient: !sendResult.success ? this.determinarSiErrorEsTransitorio(sendResult.error) : false,
    };
  }

  /**
   * Caso 2: Asignación de Orden de Trabajo a Técnico (ms-incidencias)
   */
  async procesarOrdenAsignada(evento: any): Promise<EnvioNotificacionResult> {
    const idOrden = String(evento.id_orden ?? evento.idOrden ?? 'sin-orden');
    const idIncidencia = String(
      evento.id_incidencia ?? evento.idIncidencia ?? 'sin-incidencia',
    );
    const correlationId = this.obtenerCorrelationId(evento, idOrden);
    const titulo = String(evento.titulo ?? 'Orden de Trabajo Asignada');

    const destinatario = this.obtenerDestinatario(evento, [
      'emailTecnico',
      'email',
      'correoTecnico',
      'destinatario',
    ]);

    if (!destinatario) {
      const errorMsg = `No se especificó un correo técnico destinatario real para la orden #${idOrden}. Se cancela el envío para evitar destinatarios ficticios.`;
      this.registrarLogEstructurado({
        correlationId,
        evento: 'ORDEN_ASIGNADA',
        destinatario: 'NO_ESPECIFICADO',
        asunto: `[ORDEN ASIGNADA] Orden #${idOrden.slice(0, 8)} asignada`,
        estado: 'FALLIDO',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
      return {
        status: 'fallida',
        idNotificacion: correlationId,
        error: errorMsg,
        fallback: false,
        transient: false,
      };
    }

    this.logger.log(
      `[ORDEN ASIGNADA] Despachando notificación a técnico para orden #${idOrden} a: ${destinatario}`,
    );

    const mailData: OrdenAsignadaMailData = {
      idOrden,
      idIncidencia,
      titulo,
      tecnico: evento.tecnico ?? evento.nombreTecnico,
      ubicacion: evento.ubicacion,
      diagnostico: evento.diagnostico_tecnico ?? evento.diagnostico,
    };

    const sendResult = await this.mailService.enviarNotificacionOrdenAsignada(
      destinatario,
      mailData,
    );

    const estadoFinal: EstadoNotificacion = !sendResult.success
      ? 'FALLIDO'
      : sendResult.isFallback
        ? 'SIMULADO'
        : 'ENVIADO';

    this.registrarLogEstructurado({
      correlationId,
      evento: 'ORDEN_ASIGNADA',
      destinatario,
      asunto: `[ORDEN ASIGNADA] Orden #${idOrden.slice(0, 8)} asignada`,
      estado: estadoFinal,
      messageId: sendResult.messageId,
      error: sendResult.error,
      timestamp: new Date().toISOString(),
    });

    return {
      status: sendResult.success ? 'enviada' : 'fallida',
      idNotificacion: correlationId,
      error: sendResult.error,
      fallback: sendResult.isFallback,
      transient: !sendResult.success ? this.determinarSiErrorEsTransitorio(sendResult.error) : false,
    };
  }

  /**
   * Caso 3: Resolución de Incidencia (ms-incidencias)
   */
  async procesarIncidenciaResuelta(evento: any): Promise<EnvioNotificacionResult> {
    const idIncidencia = String(
      evento.id_incidencia ?? evento.idIncidencia ?? 'sin-id',
    );
    const correlationId = this.obtenerCorrelationId(evento, idIncidencia);
    const titulo = String(evento.titulo ?? 'Incidencia Actualizada');

    // Validación estricta de estado resolutivo (Punto 2 de feedback)
    const estadoObj =
      typeof evento.estado === 'object' && evento.estado !== null
        ? evento.estado.nombre_estado
        : evento.estado;

    const nuevoEstado = String(
      evento.nombre_estado ?? evento.nuevo_estado ?? estadoObj ?? '',
    ).trim();

    if (!this.esEstadoResolutivo(nuevoEstado)) {
      const errorMsg = `El estado '${nuevoEstado}' no corresponde a una resolución o cierre de incidencia. Notificación de resolución cancelada para evitar falsos positivos.`;
      this.logger.warn(errorMsg);
      this.registrarLogEstructurado({
        correlationId,
        evento: 'INCIDENCIA_RESUELTA',
        destinatario: 'NO_APLICA',
        asunto: `[ACTUALIZACIÓN] Incidencia #${idIncidencia.slice(0, 8)}: ${nuevoEstado}`,
        estado: 'FALLIDO',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
      return {
        status: 'fallida',
        error: errorMsg,
        fallback: false,
        transient: false, // Error permanente: no se debe reintentar un estado no resolutivo
      };
    }

    const destinatario = this.obtenerDestinatario(evento, [
      'emailReportante',
      'email',
      'correoReportante',
      'destinatario',
    ]);

    if (!destinatario) {
      const errorMsg = `No se especificó un correo destinatario real para la resolución de incidencia #${idIncidencia}. Se cancela el envío para evitar destinatarios ficticios.`;
      this.registrarLogEstructurado({
        correlationId,
        evento: 'INCIDENCIA_RESUELTA',
        destinatario: 'NO_ESPECIFICADO',
        asunto: `[ACTUALIZACIÓN] Incidencia #${idIncidencia.slice(0, 8)}: ${nuevoEstado}`,
        estado: 'FALLIDO',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
      return {
        status: 'fallida',
        idNotificacion: correlationId,
        error: errorMsg,
        fallback: false,
        transient: false,
      };
    }

    this.logger.log(
      `[ESTADO CAMBIADO] Notificando resolución (${nuevoEstado}) para incidencia #${idIncidencia} a: ${destinatario}`,
    );

    const mailData: IncidenciaResueltaMailData = {
      idIncidencia,
      titulo,
      nuevoEstado,
      resolucion: evento.resolucion ?? evento.diagnostico_tecnico,
      tecnico: evento.tecnico ?? evento.nombreTecnico,
    };

    const sendResult = await this.mailService.enviarNotificacionIncidenciaResuelta(
      destinatario,
      mailData,
    );

    const estadoFinal: EstadoNotificacion = !sendResult.success
      ? 'FALLIDO'
      : sendResult.isFallback
        ? 'SIMULADO'
        : 'ENVIADO';

    this.registrarLogEstructurado({
      correlationId,
      evento: 'INCIDENCIA_RESUELTA',
      destinatario,
      asunto: `[ACTUALIZACIÓN] Incidencia #${idIncidencia.slice(0, 8)}: ${nuevoEstado}`,
      estado: estadoFinal,
      messageId: sendResult.messageId,
      error: sendResult.error,
      timestamp: new Date().toISOString(),
    });

    return {
      status: sendResult.success ? 'enviada' : 'fallida',
      idNotificacion: correlationId,
      error: sendResult.error,
      fallback: sendResult.isFallback,
      transient: !sendResult.success ? this.determinarSiErrorEsTransitorio(sendResult.error) : false,
    };
  }

  /**
   * Caso 4: Alerta de Mantenimiento Preventivo (ms-activos)
   */
  async procesarMantenimientoPreventivo(
    evento: any,
  ): Promise<EnvioNotificacionResult> {
    const idActivo = String(evento.id_activo ?? evento.idActivo ?? 'sin-activo');
    const correlationId = this.obtenerCorrelationId(evento, idActivo);
    const nombreActivo = String(
      evento.nombreActivo ?? evento.nombre_activo ?? evento.nombre ?? 'Activo Institucional',
    );
    const fechaProgramada = String(
      evento.fecha_programada ??
      evento.fechaProgramada ??
      new Date().toLocaleDateString('es-CL'),
    );

    const destinatario = this.obtenerDestinatario(
      evento,
      ['emailResponsable', 'email', 'correoResponsable', 'destinatario'],
      this.configService.get<string>('MAIL_ALERTAS_MANTENIMIENTO'),
    );

    if (!destinatario) {
      const errorMsg = `No se especificó un correo destinatario real para el mantenimiento del activo #${idActivo}. Se cancela el envío para evitar destinatarios ficticios.`;
      this.registrarLogEstructurado({
        correlationId,
        evento: 'MANTENIMIENTO_PREVENTIVO',
        destinatario: 'NO_ESPECIFICADO',
        asunto: `[MANTENIMIENTO PREVENTIVO] Activo ${nombreActivo}`,
        estado: 'FALLIDO',
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });
      return {
        status: 'fallida',
        idNotificacion: correlationId,
        error: errorMsg,
        fallback: false,
        transient: false,
      };
    }

    this.logger.log(
      `[MANTENIMIENTO] Notificando mantenimiento preventivo para activo #${idActivo} a: ${destinatario}`,
    );

    const mailData: MantenimientoPreventivoMailData = {
      idMantenimiento: evento.id_mantenimiento ?? evento.idMantenimiento,
      idActivo,
      nombreActivo,
      ubicacion: evento.ubicacion,
      fechaProgramada,
      observaciones: evento.observaciones,
    };

    const sendResult =
      await this.mailService.enviarNotificacionMantenimientoPreventivo(
        destinatario,
        mailData,
      );

    const estadoFinal: EstadoNotificacion = !sendResult.success
      ? 'FALLIDO'
      : sendResult.isFallback
        ? 'SIMULADO'
        : 'ENVIADO';

    this.registrarLogEstructurado({
      correlationId,
      evento: 'MANTENIMIENTO_PREVENTIVO',
      destinatario,
      asunto: `[MANTENIMIENTO PREVENTIVO] Activo ${nombreActivo}`,
      estado: estadoFinal,
      messageId: sendResult.messageId,
      error: sendResult.error,
      timestamp: new Date().toISOString(),
    });

    return {
      status: sendResult.success ? 'enviada' : 'fallida',
      idNotificacion: correlationId,
      error: sendResult.error,
      fallback: sendResult.isFallback,
      transient: !sendResult.success ? this.determinarSiErrorEsTransitorio(sendResult.error) : false,
    };
  }

  /**
   * Despachador de evento unificado desde RabbitMQ (cola notificaciones.queue)
   */
  async procesarEventoNotificacion(
    dto: NotificacionEventoDto,
  ): Promise<EnvioNotificacionResult> {
    const tipoEvento =
      (dto.metadata?.evento as string) ??
      (dto.prioridad === PrioridadNotificacion.CRITICA
        ? 'INCIDENCIA_CRITICA'
        : 'GENERAL');

    switch (tipoEvento.toUpperCase()) {
      case 'INCIDENCIA_CRITICA':
        return this.procesarIncidenciaCritica({
          ...dto.metadata,
          asunto: dto.asunto,
          descripcion: dto.cuerpo,
          destinatario: dto.destinatario,
        });

      case 'ORDEN_ASIGNADA':
        return this.procesarOrdenAsignada({
          ...dto.metadata,
          asunto: dto.asunto,
          destinatario: dto.destinatario,
        });

      case 'INCIDENCIA_RESUELTA':
      case 'INCIDENCIA_ACTUALIZADA':
        return this.procesarIncidenciaResuelta({
          ...dto.metadata,
          asunto: dto.asunto,
          destinatario: dto.destinatario,
        });

      case 'MANTENIMIENTO_PREVENTIVO':
        return this.procesarMantenimientoPreventivo({
          ...dto.metadata,
          asunto: dto.asunto,
          destinatario: dto.destinatario,
        });

      default: {
        const correlationId = dto.idCorrelacion ?? crypto.randomUUID();
        const destinatario = this.obtenerDestinatario(dto, ['destinatario']);
        if (!destinatario) {
          const errorMsg =
            'No se especificó un destinatario de correo válido para el evento genérico.';
          this.registrarLogEstructurado({
            correlationId,
            evento: 'GENERAL',
            destinatario: 'NO_ESPECIFICADO',
            asunto: dto.asunto,
            estado: 'FALLIDO',
            error: errorMsg,
            timestamp: new Date().toISOString(),
          });
          return {
            status: 'fallida',
            idNotificacion: correlationId,
            error: errorMsg,
            fallback: false,
            transient: false,
          };
        }

        const sendResult = await this.mailService.enviarCorreo({
          to: destinatario,
          subject: dto.asunto,
          html: `<div style="font-family: Arial, sans-serif;"><h2>${dto.asunto}</h2><p>${dto.cuerpo}</p></div>`,
          text: dto.cuerpo,
        });

        const estadoFinal: EstadoNotificacion = !sendResult.success
          ? 'FALLIDO'
          : sendResult.isFallback
            ? 'SIMULADO'
            : 'ENVIADO';

        this.registrarLogEstructurado({
          correlationId,
          evento: 'GENERAL',
          destinatario,
          asunto: dto.asunto,
          estado: estadoFinal,
          messageId: sendResult.messageId,
          error: sendResult.error,
          timestamp: new Date().toISOString(),
        });

        return {
          status: sendResult.success ? 'enviada' : 'fallida',
          idNotificacion: correlationId,
          error: sendResult.error,
          fallback: sendResult.isFallback,
          transient: !sendResult.success ? this.determinarSiErrorEsTransitorio(sendResult.error) : false,
        };
      }
    }
  }

  // =========================================================================
  // Métodos Auxiliares de Validación y Trazabilidad Estructurada
  // =========================================================================

  private esEstadoResolutivo(estado: string): boolean {
    const normalizado = estado.trim().toUpperCase();
    const estadosResolucion = [
      'RESUELTA',
      'RESUELTO',
      'CERRADA',
      'CERRADO',
      'FINALIZADA',
      'FINALIZADO',
    ];
    return estadosResolucion.includes(normalizado);
  }

  private validarEmail(emailRaw?: string | null): string | null {
    if (!emailRaw || typeof emailRaw !== 'string') return null;
    const limpio = emailRaw.trim();
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(limpio) ? limpio : null;
  }

  private obtenerDestinatario(
    objeto: any,
    campos: string[],
    fallbackEnv?: string,
  ): string | null {
    if (!objeto) return null;

    if (objeto.destinatario) {
      if (typeof objeto.destinatario === 'string') {
        const v = this.validarEmail(objeto.destinatario);
        if (v) return v;
      } else if (typeof objeto.destinatario === 'object') {
        const dir = objeto.destinatario.direccion ?? objeto.destinatario.email;
        const v = this.validarEmail(dir);
        if (v) return v;
      }
    }

    for (const campo of campos) {
      if (campo === 'destinatario') continue;
      const v = this.validarEmail(objeto[campo]);
      if (v) return v;
    }

    if (fallbackEnv) {
      const v = this.validarEmail(fallbackEnv);
      if (v) return v;
    }

    return null;
  }

  private obtenerCorrelationId(evento: any, fallbackId: string): string {
    return String(
      evento.idCorrelacion ??
      evento.correlationId ??
      evento.id_correlacion ??
      fallbackId ??
      crypto.randomUUID(),
    );
  }

  private determinarSiErrorEsTransitorio(error?: string): boolean {
    if (!error) return false;
    const errorLower = error.toLowerCase();
    // Errores de red / conexión SMTP transitorios
    const patronesTransitorios = [
      'timeout',
      'timedout',
      'econnrefused',
      'econnreset',
      'etimedout',
      'esockettimedout',
      'eai_again',
      'enotfound',
      'network',
      'connection refused',
      'connection closed',
      'broker',
      'temporary',
    ];

    return patronesTransitorios.some((patron) => errorLower.includes(patron));
  }

  private registrarLogEstructurado(datos: NotificacionLogEstructurado): void {
    const payloadConIntentos: NotificacionLogEstructurado = {
      ...datos,
      intentos: datos.intentos ?? 1,
    };
    const payloadJson = JSON.stringify(payloadConIntentos);
    if (datos.estado === 'FALLIDO') {
      this.logger.error(`[NOTIFICACION_AUDITORIA] ${payloadJson}`);
    } else {
      this.logger.log(`[NOTIFICACION_AUDITORIA] ${payloadJson}`);
    }
  }
}
