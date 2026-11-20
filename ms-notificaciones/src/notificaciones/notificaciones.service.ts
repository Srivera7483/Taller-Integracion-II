import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EstadoNotificacion,
  TipoEventoNotificacion,
  TipoNotificacion,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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

export interface EnvioNotificacionResult {
  status: 'enviada' | 'fallida';
  idNotificacion?: string;
  error?: string;
  fallback: boolean;
}

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Endpoint REST: Encola y despacha un correo directo
   */
  async notificar(
    payload: CreateNotificacionDto,
  ): Promise<EnvioNotificacionResult> {
    this.logger.log(`Despachando notificación directa a: ${payload.email}`);

    const destinatario = this.validarEmail(payload.email);
    if (!destinatario) {
      const errorMsg = `Formato de correo destinatario inválido: '${payload.email}'.`;
      this.logger.error(errorMsg);
      return {
        status: 'fallida',
        error: errorMsg,
        fallback: false,
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

    return this.registrarYEnviar({
      tipo: TipoNotificacion.EMAIL,
      evento: TipoEventoNotificacion.GENERAL,
      destinatario,
      asunto: payload.asunto,
      cuerpo: payload.cuerpoMensaje,
      sendEmailFn: () =>
        this.mailService.enviarCorreo({
          to: destinatario,
          subject: payload.asunto,
          html: htmlContent,
          text: payload.cuerpoMensaje,
        }),
    });
  }

  /**
   * Caso 1: Incidencia Crítica Reportada (ms-incidencias)
   */
  async procesarIncidenciaCritica(evento: any): Promise<EnvioNotificacionResult> {
    const idIncidencia = String(
      evento.id_incidencia ?? evento.idIncidencia ?? 'sin-id',
    );
    const titulo = String(evento.titulo ?? 'Incidencia Crítica Sin Título');
    const descripcion = String(
      evento.descripcion ?? 'Sin descripción detallada.',
    );

    const destinatario = this.obtenerDestinatario(evento, [
      'emailDestinatario',
      'email',
      'destinatario',
    ], this.configService.get<string>('MAIL_ALERTAS_CRITICAS'));

    if (!destinatario) {
      const errorMsg = `No se especificó un correo destinatario real para la incidencia crítica #${idIncidencia} (campo email ausente y MAIL_ALERTAS_CRITICAS no configurado). Se cancela el envío para evitar destinatarios ficticios.`;
      this.logger.error(errorMsg);
      return this.registrarFalloInmediato({
        tipo: TipoNotificacion.EMAIL,
        evento: TipoEventoNotificacion.INCIDENCIA_CRITICA,
        destinatario: 'NO_ESPECIFICADO',
        asunto: `[ALERTA CRÍTICA] Incidencia #${idIncidencia.slice(0, 8)}: ${titulo}`,
        cuerpo: descripcion,
        error: errorMsg,
        idReferencia: idIncidencia,
        metadata: evento,
      });
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

    return this.registrarYEnviar({
      tipo: TipoNotificacion.EMAIL,
      evento: TipoEventoNotificacion.INCIDENCIA_CRITICA,
      destinatario,
      asunto: `[ALERTA CRÍTICA] Incidencia #${idIncidencia.slice(0, 8)}: ${titulo}`,
      cuerpo: descripcion,
      idReferencia: idIncidencia,
      metadata: evento,
      sendEmailFn: () =>
        this.mailService.enviarNotificacionIncidenciaCritica(
          destinatario,
          mailData,
        ),
    });
  }

  /**
   * Caso 2: Asignación de Orden de Trabajo a Técnico (ms-incidencias)
   */
  async procesarOrdenAsignada(evento: any): Promise<EnvioNotificacionResult> {
    const idOrden = String(evento.id_orden ?? evento.idOrden ?? 'sin-orden');
    const idIncidencia = String(
      evento.id_incidencia ?? evento.idIncidencia ?? 'sin-incidencia',
    );
    const titulo = String(evento.titulo ?? 'Orden de Trabajo Asignada');

    const destinatario = this.obtenerDestinatario(evento, [
      'emailTecnico',
      'email',
      'correoTecnico',
      'destinatario',
    ]);

    if (!destinatario) {
      const errorMsg = `No se especificó un correo técnico destinatario real para la orden #${idOrden}. Se cancela el envío para evitar destinatarios ficticios.`;
      this.logger.error(errorMsg);
      return this.registrarFalloInmediato({
        tipo: TipoNotificacion.EMAIL,
        evento: TipoEventoNotificacion.ORDEN_ASIGNADA,
        destinatario: 'NO_ESPECIFICADO',
        asunto: `[ORDEN ASIGNADA] Orden #${idOrden.slice(0, 8)} asignada`,
        cuerpo: `Asignación de orden de trabajo para incidencia #${idIncidencia}`,
        error: errorMsg,
        idReferencia: idOrden,
        metadata: evento,
      });
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

    return this.registrarYEnviar({
      tipo: TipoNotificacion.EMAIL,
      evento: TipoEventoNotificacion.ORDEN_ASIGNADA,
      destinatario,
      asunto: `[ORDEN ASIGNADA] Orden #${idOrden.slice(0, 8)} asignada`,
      cuerpo: `Asignación de orden de trabajo para incidencia #${idIncidencia}`,
      idReferencia: idOrden,
      metadata: evento,
      sendEmailFn: () =>
        this.mailService.enviarNotificacionOrdenAsignada(
          destinatario,
          mailData,
        ),
    });
  }

  /**
   * Caso 3: Resolución de Incidencia (ms-incidencias)
   */
  async procesarIncidenciaResuelta(evento: any): Promise<EnvioNotificacionResult> {
    const idIncidencia = String(
      evento.id_incidencia ?? evento.idIncidencia ?? 'sin-id',
    );
    const titulo = String(evento.titulo ?? 'Incidencia Actualizada');

    // Validación estricta de estado resolutivo (Punto 2 de feedback)
    const nuevoEstado = String(
      evento.nombre_estado ?? evento.nuevo_estado ?? evento.estado ?? '',
    ).trim();

    if (!this.esEstadoResolutivo(nuevoEstado)) {
      const errorMsg = `El estado '${nuevoEstado}' no corresponde a una resolución o cierre de incidencia. Notificación de resolución cancelada para evitar falsos positivos.`;
      this.logger.warn(errorMsg);
      return {
        status: 'fallida',
        error: errorMsg,
        fallback: false,
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
      this.logger.error(errorMsg);
      return this.registrarFalloInmediato({
        tipo: TipoNotificacion.EMAIL,
        evento: TipoEventoNotificacion.INCIDENCIA_RESUELTA,
        destinatario: 'NO_ESPECIFICADO',
        asunto: `[ACTUALIZACIÓN] Incidencia #${idIncidencia.slice(0, 8)}: ${nuevoEstado}`,
        cuerpo: `La incidencia #${idIncidencia} ha sido actualizada al estado ${nuevoEstado}`,
        error: errorMsg,
        idReferencia: idIncidencia,
        metadata: evento,
      });
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

    return this.registrarYEnviar({
      tipo: TipoNotificacion.EMAIL,
      evento: TipoEventoNotificacion.INCIDENCIA_RESUELTA,
      destinatario,
      asunto: `[ACTUALIZACIÓN] Incidencia #${idIncidencia.slice(0, 8)}: ${nuevoEstado}`,
      cuerpo: `La incidencia #${idIncidencia} ha sido actualizada al estado ${nuevoEstado}`,
      idReferencia: idIncidencia,
      metadata: evento,
      sendEmailFn: () =>
        this.mailService.enviarNotificacionIncidenciaResuelta(
          destinatario,
          mailData,
        ),
    });
  }

  /**
   * Caso 4: Alerta de Mantenimiento Preventivo (ms-activos)
   */
  async procesarMantenimientoPreventivo(
    evento: any,
  ): Promise<EnvioNotificacionResult> {
    const idActivo = String(evento.id_activo ?? evento.idActivo ?? 'sin-activo');
    const nombreActivo = String(
      evento.nombreActivo ?? evento.nombre_activo ?? evento.nombre ?? 'Activo Institucional',
    );
    const fechaProgramada = String(
      evento.fecha_programada ??
      evento.fechaProgramada ??
      new Date().toLocaleDateString('es-CL'),
    );

    const destinatario = this.obtenerDestinatario(evento, [
      'emailResponsable',
      'email',
      'correoResponsable',
      'destinatario',
    ], this.configService.get<string>('MAIL_ALERTAS_MANTENIMIENTO'));

    if (!destinatario) {
      const errorMsg = `No se especificó un correo destinatario real para el mantenimiento del activo #${idActivo}. Se cancela el envío para evitar destinatarios ficticios.`;
      this.logger.error(errorMsg);
      return this.registrarFalloInmediato({
        tipo: TipoNotificacion.EMAIL,
        evento: TipoEventoNotificacion.MANTENIMIENTO_PREVENTIVO,
        destinatario: 'NO_ESPECIFICADO',
        asunto: `[MANTENIMIENTO PREVENTIVO] Activo ${nombreActivo}`,
        cuerpo: `Mantenimiento preventivo programado para activo ${idActivo} el ${fechaProgramada}`,
        error: errorMsg,
        idReferencia: idActivo,
        metadata: evento,
      });
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

    return this.registrarYEnviar({
      tipo: TipoNotificacion.EMAIL,
      evento: TipoEventoNotificacion.MANTENIMIENTO_PREVENTIVO,
      destinatario,
      asunto: `[MANTENIMIENTO PREVENTIVO] Activo ${nombreActivo}`,
      cuerpo: `Mantenimiento preventivo programado para activo ${idActivo} el ${fechaProgramada}`,
      idReferencia: idActivo,
      metadata: evento,
      sendEmailFn: () =>
        this.mailService.enviarNotificacionMantenimientoPreventivo(
          destinatario,
          mailData,
        ),
    });
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
        const destinatario = this.obtenerDestinatario(dto, ['destinatario']);
        if (!destinatario) {
          const errorMsg = 'No se especificó un destinatario de correo válido para el evento genérico.';
          this.logger.error(errorMsg);
          return {
            status: 'fallida',
            error: errorMsg,
            fallback: false,
          };
        }

        return this.registrarYEnviar({
          tipo: TipoNotificacion.EMAIL,
          evento: TipoEventoNotificacion.GENERAL,
          destinatario,
          asunto: dto.asunto,
          cuerpo: dto.cuerpo,
          idReferencia: dto.idCorrelacion,
          metadata: dto.metadata,
          sendEmailFn: () =>
            this.mailService.enviarCorreo({
              to: destinatario,
              subject: dto.asunto,
              html: `<div style="font-family: Arial, sans-serif;"><h2>${dto.asunto}</h2><p>${dto.cuerpo}</p></div>`,
              text: dto.cuerpo,
            }),
        });
      }
    }
  }

  // =========================================================================
  // Métodos Auxiliares de Validación y Persistencia en Dos Fases
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

  /**
   * Persistencia estricta en dos fases:
   * 1. Registra estado PENDIENTE. Si falla la BD, aborta inmediatamente sin enviar correo.
   * 2. Despacha el correo.
   * 3. Actualiza a ENVIADO, SIMULADO (si fue fallback en desarrollo) o FALLIDO.
   */
  private async registrarYEnviar(params: {
    tipo: TipoNotificacion;
    evento: TipoEventoNotificacion;
    destinatario: string;
    asunto: string;
    cuerpo: string;
    idReferencia?: string;
    metadata?: any;
    sendEmailFn: () => Promise<MailSendResult>;
  }): Promise<EnvioNotificacionResult> {
    let notificacionId: string;

    // 1. Fase Inicial de Persistencia (Garantía de Trazabilidad)
    try {
      const registroInicial = await this.prisma.notificacion.create({
        data: {
          tipo: params.tipo,
          evento: params.evento,
          destinatario: params.destinatario,
          asunto: params.asunto,
          cuerpo: params.cuerpo,
          estado: EstadoNotificacion.PENDIENTE,
          id_referencia: params.idReferencia,
          metadata: params.metadata
            ? JSON.parse(JSON.stringify(params.metadata))
            : undefined,
        },
      });
      notificacionId = registroInicial.id_notificacion;
    } catch (dbError) {
      const dbErrMsg = `Fallo crítico de persistencia en NOTIFICACIONES: ${dbError instanceof Error ? dbError.message : String(dbError)
        }. Se cancela el envío para no informar envíos sin trazabilidad.`;
      this.logger.error(dbErrMsg);
      return {
        status: 'fallida',
        error: dbErrMsg,
        fallback: false,
      };
    }

    // 2. Fase de Envío de Correo
    const sendResult = await params.sendEmailFn();

    // 3. Determinación estricta del estado final (Punto 5 de feedback)
    let estadoFinal: EstadoNotificacion;
    if (!sendResult.success) {
      estadoFinal = EstadoNotificacion.FALLIDO;
    } else if (sendResult.isFallback) {
      // Los correos simulados en fallback NUNCA se registran como ENVIADO
      estadoFinal = EstadoNotificacion.SIMULADO;
    } else {
      estadoFinal = EstadoNotificacion.ENVIADO;
    }

    // 4. Actualización final en Base de Datos
    try {
      await this.prisma.notificacion.update({
        where: { id_notificacion: notificacionId },
        data: {
          estado: estadoFinal,
          error: sendResult.error ?? null,
          fecha_envio:
            sendResult.success && !sendResult.isFallback ? new Date() : null,
        },
      });
    } catch (updateError) {
      const updateErrMsg = `Fallo al actualizar trazabilidad final en NOTIFICACIONES (${notificacionId}): ${updateError instanceof Error ? updateError.message : String(updateError)
        }`;
      this.logger.error(updateErrMsg);
      return {
        status: 'fallida',
        idNotificacion: notificacionId,
        error: updateErrMsg,
        fallback: sendResult.isFallback,
      };
    }

    return {
      status: sendResult.success ? 'enviada' : 'fallida',
      idNotificacion: notificacionId,
      error: sendResult.error,
      fallback: sendResult.isFallback,
    };
  }

  private async registrarFalloInmediato(params: {
    tipo: TipoNotificacion;
    evento: TipoEventoNotificacion;
    destinatario: string;
    asunto: string;
    cuerpo: string;
    error: string;
    idReferencia?: string;
    metadata?: any;
  }): Promise<EnvioNotificacionResult> {
    try {
      const reg = await this.prisma.notificacion.create({
        data: {
          tipo: params.tipo,
          evento: params.evento,
          destinatario: params.destinatario,
          asunto: params.asunto,
          cuerpo: params.cuerpo,
          estado: EstadoNotificacion.FALLIDO,
          error: params.error,
          id_referencia: params.idReferencia,
          metadata: params.metadata
            ? JSON.parse(JSON.stringify(params.metadata))
            : undefined,
        },
      });
      return {
        status: 'fallida',
        idNotificacion: reg.id_notificacion,
        error: params.error,
        fallback: false,
      };
    } catch (dbErr) {
      this.logger.error(
        `No se pudo registrar fallo en NOTIFICACIONES: ${dbErr instanceof Error ? dbErr.message : String(dbErr)
        }`,
      );
      return {
        status: 'fallida',
        error: params.error,
        fallback: false,
      };
    }
  }
}
