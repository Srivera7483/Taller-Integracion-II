import { Injectable, Logger } from '@nestjs/common';
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
  ) {}

  /**
   * Endpoint REST: Encola y despacha un correo directo
   */
  async notificar(
    payload: CreateNotificacionDto,
  ): Promise<EnvioNotificacionResult> {
    this.logger.log(`Despachando notificación directa a: ${payload.email}`);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #1e3a8a;">${payload.asunto}</h2>
        <p style="font-size: 15px; line-height: 1.6;">${payload.cuerpoMensaje}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 24px;" />
        <small style="color: #64748b;">InfraManager - Plataforma Institucional</small>
      </div>
    `;

    const sendResult = await this.mailService.enviarCorreo({
      to: payload.email,
      subject: payload.asunto,
      html: htmlContent,
      text: payload.cuerpoMensaje,
    });

    const registro = await this.guardarTrazabilidad({
      tipo: TipoNotificacion.EMAIL,
      evento: TipoEventoNotificacion.GENERAL,
      destinatario: payload.email,
      asunto: payload.asunto,
      cuerpo: payload.cuerpoMensaje,
      estado: sendResult.success
        ? EstadoNotificacion.ENVIADO
        : EstadoNotificacion.FALLIDO,
      error: sendResult.error,
      fecha_envio: sendResult.success ? new Date() : undefined,
    });

    return {
      status: sendResult.success ? 'enviada' : 'fallida',
      idNotificacion: registro?.id_notificacion,
      error: sendResult.error,
      fallback: sendResult.isFallback,
    };
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
    const destinatario = String(
      evento.destinatario?.direccion ??
        evento.destinatario?.email ??
        evento.email ??
        process.env.MAIL_ALERTAS_CRITICAS ??
        'guardia-incidencias@institucion.edu',
    );

    this.logger.warn(
      `[CRÍTICA] Despachando alerta por correo para incidencia #${idIncidencia}`,
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

    const sendResult =
      await this.mailService.enviarNotificacionIncidenciaCritica(
        destinatario,
        mailData,
      );

    const registro = await this.guardarTrazabilidad({
      tipo: TipoNotificacion.EMAIL,
      evento: TipoEventoNotificacion.INCIDENCIA_CRITICA,
      destinatario,
      asunto: `[ALERTA CRÍTICA] Incidencia #${idIncidencia.slice(0, 8)}: ${titulo}`,
      cuerpo: descripcion,
      estado: sendResult.success
        ? EstadoNotificacion.ENVIADO
        : EstadoNotificacion.FALLIDO,
      error: sendResult.error,
      id_referencia: idIncidencia,
      metadata: evento,
      fecha_envio: sendResult.success ? new Date() : undefined,
    });

    return {
      status: sendResult.success ? 'enviada' : 'fallida',
      idNotificacion: registro?.id_notificacion,
      error: sendResult.error,
      fallback: sendResult.isFallback,
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
    const titulo = String(evento.titulo ?? 'Orden de Trabajo Asignada');
    const destinatario = String(
      evento.destinatario?.direccion ??
        evento.destinatario?.email ??
        evento.emailTecnico ??
        evento.email ??
        'tecnico-asignado@institucion.edu',
    );

    this.logger.log(
      `[ORDEN ASIGNADA] Despachando notificación a técnico para orden #${idOrden}`,
    );

    const mailData: OrdenAsignadaMailData = {
      idOrden,
      idIncidencia,
      titulo,
      tecnico: evento.tecnico ?? evento.nombreTecnico,
      ubicacion: evento.ubicacion,
      diagnostico: evento.diagnostico_tecnico ?? evento.diagnostico,
    };

    const sendResult =
      await this.mailService.enviarNotificacionOrdenAsignada(
        destinatario,
        mailData,
      );

    const registro = await this.guardarTrazabilidad({
      tipo: TipoNotificacion.EMAIL,
      evento: TipoEventoNotificacion.ORDEN_ASIGNADA,
      destinatario,
      asunto: `[ORDEN ASIGNADA] Orden #${idOrden.slice(0, 8)} asignada`,
      cuerpo: `Asignación de orden de trabajo para incidencia #${idIncidencia}`,
      estado: sendResult.success
        ? EstadoNotificacion.ENVIADO
        : EstadoNotificacion.FALLIDO,
      error: sendResult.error,
      id_referencia: idOrden,
      metadata: evento,
      fecha_envio: sendResult.success ? new Date() : undefined,
    });

    return {
      status: sendResult.success ? 'enviada' : 'fallida',
      idNotificacion: registro?.id_notificacion,
      error: sendResult.error,
      fallback: sendResult.isFallback,
    };
  }

  /**
   * Caso 3: Resolución / Cambio de Estado de Incidencia (ms-incidencias)
   */
  async procesarIncidenciaResuelta(evento: any): Promise<EnvioNotificacionResult> {
    const idIncidencia = String(
      evento.id_incidencia ?? evento.idIncidencia ?? 'sin-id',
    );
    const titulo = String(evento.titulo ?? 'Incidencia Actualizada');
    const nuevoEstado = String(
      evento.nombre_estado ?? evento.estado ?? evento.nuevoEstado ?? 'RESUELTO',
    );
    const destinatario = String(
      evento.destinatario?.direccion ??
        evento.destinatario?.email ??
        evento.emailReportante ??
        evento.email ??
        'reportante@institucion.edu',
    );

    this.logger.log(
      `[ESTADO CAMBIADO] Notificando cambio a '${nuevoEstado}' para incidencia #${idIncidencia}`,
    );

    const mailData: IncidenciaResueltaMailData = {
      idIncidencia,
      titulo,
      nuevoEstado,
      resolucion: evento.resolucion ?? evento.diagnostico_tecnico,
      tecnico: evento.tecnico ?? evento.nombreTecnico,
    };

    const sendResult =
      await this.mailService.enviarNotificacionIncidenciaResuelta(
        destinatario,
        mailData,
      );

    const registro = await this.guardarTrazabilidad({
      tipo: TipoNotificacion.EMAIL,
      evento: TipoEventoNotificacion.INCIDENCIA_RESUELTA,
      destinatario,
      asunto: `[ACTUALIZACIÓN] Incidencia #${idIncidencia.slice(0, 8)}: ${nuevoEstado}`,
      cuerpo: `La incidencia #${idIncidencia} ha sido actualizada al estado ${nuevoEstado}`,
      estado: sendResult.success
        ? EstadoNotificacion.ENVIADO
        : EstadoNotificacion.FALLIDO,
      error: sendResult.error,
      id_referencia: idIncidencia,
      metadata: evento,
      fecha_envio: sendResult.success ? new Date() : undefined,
    });

    return {
      status: sendResult.success ? 'enviada' : 'fallida',
      idNotificacion: registro?.id_notificacion,
      error: sendResult.error,
      fallback: sendResult.isFallback,
    };
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
    const destinatario = String(
      evento.destinatario?.direccion ??
        evento.destinatario?.email ??
        evento.emailResponsable ??
        evento.email ??
        'mantenimiento-activos@institucion.edu',
    );

    this.logger.log(
      `[MANTENIMIENTO] Notificando mantenimiento preventivo para activo #${idActivo}`,
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

    const registro = await this.guardarTrazabilidad({
      tipo: TipoNotificacion.EMAIL,
      evento: TipoEventoNotificacion.MANTENIMIENTO_PREVENTIVO,
      destinatario,
      asunto: `[MANTENIMIENTO PREVENTIVO] Activo ${nombreActivo}`,
      cuerpo: `Mantenimiento preventivo programado para activo ${idActivo} el ${fechaProgramada}`,
      estado: sendResult.success
        ? EstadoNotificacion.ENVIADO
        : EstadoNotificacion.FALLIDO,
      error: sendResult.error,
      id_referencia: idActivo,
      metadata: evento,
      fecha_envio: sendResult.success ? new Date() : undefined,
    });

    return {
      status: sendResult.success ? 'enviada' : 'fallida',
      idNotificacion: registro?.id_notificacion,
      error: sendResult.error,
      fallback: sendResult.isFallback,
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
        const destinatario =
          dto.destinatario?.direccion ??
          process.env.MAIL_FROM ??
          'notificaciones@institucion.edu';

        const sendResult = await this.mailService.enviarCorreo({
          to: destinatario,
          subject: dto.asunto,
          html: `<div style="font-family: Arial, sans-serif;"><h2>${dto.asunto}</h2><p>${dto.cuerpo}</p></div>`,
          text: dto.cuerpo,
        });

        const registro = await this.guardarTrazabilidad({
          tipo: TipoNotificacion.EMAIL,
          evento: TipoEventoNotificacion.GENERAL,
          destinatario,
          asunto: dto.asunto,
          cuerpo: dto.cuerpo,
          estado: sendResult.success
            ? EstadoNotificacion.ENVIADO
            : EstadoNotificacion.FALLIDO,
          error: sendResult.error,
          id_referencia: dto.idCorrelacion,
          metadata: dto.metadata,
          fecha_envio: sendResult.success ? new Date() : undefined,
        });

        return {
          status: sendResult.success ? 'enviada' : 'fallida',
          idNotificacion: registro?.id_notificacion,
          error: sendResult.error,
          fallback: sendResult.isFallback,
        };
      }
    }
  }

  /**
   * Persistencia en tabla NOTIFICACIONES con tolerancia a fallas de base de datos
   */
  private async guardarTrazabilidad(data: {
    tipo: TipoNotificacion;
    evento: TipoEventoNotificacion;
    destinatario: string;
    asunto: string;
    cuerpo: string;
    estado: EstadoNotificacion;
    reintentos?: number;
    error?: string;
    id_referencia?: string;
    metadata?: any;
    fecha_envio?: Date;
  }) {
    try {
      if (!this.prisma.connected) {
        this.logger.warn(
          'Base de datos PostgreSQL desconectada: Trazabilidad omitida sin derribar servicio.',
        );
        return null;
      }

      return await this.prisma.notificacion.create({
        data: {
          tipo: data.tipo,
          evento: data.evento,
          destinatario: data.destinatario,
          asunto: data.asunto,
          cuerpo: data.cuerpo,
          estado: data.estado,
          reintentos: data.reintentos ?? 0,
          error: data.error,
          id_referencia: data.id_referencia,
          metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
          fecha_envio: data.fecha_envio,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error persistiendo trazabilidad en NOTIFICACIONES: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }
}
