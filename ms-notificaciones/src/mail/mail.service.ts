import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface MailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  isFallback: boolean;
}

export interface IncidenciaCriticaMailData {
  idIncidencia: string;
  titulo: string;
  descripcion: string;
  ubicacion?: string;
  prioridad?: string;
  reportante?: string;
  fecha?: string;
}

export interface OrdenAsignadaMailData {
  idOrden: string;
  idIncidencia: string;
  titulo: string;
  tecnico?: string;
  ubicacion?: string;
  diagnostico?: string;
  fecha?: string;
}

export interface IncidenciaResueltaMailData {
  idIncidencia: string;
  titulo: string;
  estadoAnterior?: string;
  nuevoEstado: string;
  resolucion?: string;
  fechaCierre?: string;
  tecnico?: string;
}

export interface MantenimientoPreventivoMailData {
  idMantenimiento?: string;
  idActivo: string;
  nombreActivo: string;
  ubicacion?: string;
  fechaProgramada: string;
  observaciones?: string;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private isFallbackMode = false;
  private defaultFrom = 'InfraManager <notificaciones@institucion.edu>';
  private currentEnv = 'development';

  constructor(private readonly configService: ConfigService) { }

  onModuleInit(): void {
    this.inicializarTransporte();
  }

  inicializarTransporte(): void {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') ?? 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const secure =
      this.configService.get<string>('SMTP_SECURE') === 'true' || port === 465;
    const configuredFrom = this.configService.get<string>('MAIL_FROM');
    const rawEnv = this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
    this.currentEnv = rawEnv.toLowerCase();
    const allowFallbackExplicit =
      this.currentEnv !== 'production' &&
      this.configService.get<string>('ALLOW_SMTP_FALLBACK') === 'true';

    if (configuredFrom) {
      this.defaultFrom = configuredFrom;
    }

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      this.isFallbackMode = false;
      this.logger.log(
        `Transporte SMTP configurado hacia ${host}:${port} (${user}) [Entorno: ${this.currentEnv}]`,
      );
    } else {
      // El modo fallback simulado SOLO se permite en entornos de desarrollo y pruebas
      const isDevOrTest = this.currentEnv === 'development' || this.currentEnv === 'test';
      if (isDevOrTest || allowFallbackExplicit) {
        this.transporter = nodemailer.createTransport({
          jsonTransport: true,
        });
        this.isFallbackMode = true;
        this.logger.warn(
          `Transporte SMTP no configurado. Operando en modo FALLBACK SEGURO (jsonTransport simulado en memoria) [Entorno: ${this.currentEnv}].`,
        );
      } else {
        // En producción u otros entornos, NO se permite fallback silencioso
        this.transporter = null;
        this.isFallbackMode = false;
        this.logger.error(
          `Transporte SMTP no configurado en entorno '${this.currentEnv}'. El fallback simulado está estrictamente deshabilitado fuera de desarrollo.`,
        );
      }
    }
  }

  isFallback(): boolean {
    return this.isFallbackMode;
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async enviarCorreo(options: SendMailOptions): Promise<MailSendResult> {
    if (!this.transporter) {
      const errorMsg = `Transporte SMTP no configurado en entorno '${this.currentEnv}'. El envío real fue denegado y no se permite simulación en este entorno.`;
      this.logger.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
        isFallback: false,
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: options.from || this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });

      if (this.isFallbackMode) {
        this.logger.log(
          `[FALLBACK SMTP - SIMULADO] Correo simulado a: ${options.to} | Asunto: ${options.subject}`,
        );
      } else {
        this.logger.log(
          `[SMTP REAL] Correo enviado a: ${options.to} | ID: ${info.messageId}`,
        );
      }

      return {
        success: true,
        messageId: info.messageId ?? 'mock-message-id',
        isFallback: this.isFallbackMode,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error enviando correo a ${options.to}: ${errorMsg}`,
      );
      return {
        success: false,
        error: errorMsg,
        isFallback: this.isFallbackMode,
      };
    }
  }

  // =========================================================================
  // Plantillas HTML Estructuradas para Eventos de Negocio
  // =========================================================================

  escapeHtml(value?: string | null): string {
    if (!value) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async enviarNotificacionIncidenciaCritica(
    destinatario: string,
    data: IncidenciaCriticaMailData,
  ): Promise<MailSendResult> {
    const asunto = `[ALERTA CRÍTICA] Incidencia reportada #${data.idIncidencia.slice(0, 8)}: ${data.titulo}`;
    const idIncSafe = this.escapeHtml(data.idIncidencia);
    const tituloSafe = this.escapeHtml(data.titulo);
    const ubicacionSafe = this.escapeHtml(data.ubicacion);
    const reportanteSafe = this.escapeHtml(data.reportante);
    const descripcionSafe = this.escapeHtml(data.descripcion);
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${this.escapeHtml(asunto)}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="background-color: #dc2626; color: #ffffff; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">🚨 Incidencia Crítica Reportada</h1>
      <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">InfraManager - Plataforma Institucional</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; color: #334155;">Se ha registrado una incidencia clasificada como <strong>CRÍTICA</strong> que requiere atención inmediata del equipo técnico:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; width: 35%;">ID Incidencia:</td>
          <td style="padding: 10px; font-weight: bold; color: #0f172a;">${idIncSafe}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b;">Título:</td>
          <td style="padding: 10px; font-weight: bold; color: #0f172a;">${tituloSafe}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b;">Prioridad:</td>
          <td style="padding: 10px;"><span style="background: #fee2e2; color: #991b1b; padding: 3px 8px; border-radius: 4px; font-weight: bold;">CRÍTICA</span></td>
        </tr>
        ${data.ubicacion ? `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b;">Ubicación:</td>
          <td style="padding: 10px; color: #0f172a;">${ubicacionSafe}</td>
        </tr>` : ''}
        ${data.reportante ? `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b;">Reportado por:</td>
          <td style="padding: 10px; color: #0f172a;">${reportanteSafe}</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 10px; color: #64748b; vertical-align: top;">Descripción:</td>
          <td style="padding: 10px; color: #334155; line-height: 1.5;">${descripcionSafe}</td>
        </tr>
      </table>

      <div style="background: #fff1f2; border-left: 4px solid #e11d48; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 13px; color: #881337;">
        <strong>Protocolo de Emergencia:</strong> Se ha notificado al personal de guardia. Favor de ingresar a la plataforma para coordinar la asignación de orden de trabajo.
      </div>
    </div>
    <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
      Este es un correo institucional generado automáticamente. Por favor no responda directamente a este remitente.
    </div>
  </div>
</body>
</html>`;

    return this.enviarCorreo({ to: destinatario, subject: asunto, html });
  }

  async enviarNotificacionOrdenAsignada(
    destinatario: string,
    data: OrdenAsignadaMailData,
  ): Promise<MailSendResult> {
    const asunto = `[ORDEN ASIGNADA] Orden de Trabajo #${data.idOrden.slice(0, 8)} asignada`;
    const tecnicoSafe = this.escapeHtml(data.tecnico);
    const idOrdenSafe = this.escapeHtml(data.idOrden);
    const idIncidenciaSafe = this.escapeHtml(data.idIncidencia);
    const tituloSafe = this.escapeHtml(data.titulo);
    const ubicacionSafe = this.escapeHtml(data.ubicacion);
    const diagnosticoSafe = this.escapeHtml(data.diagnostico);
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${this.escapeHtml(asunto)}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 20px; text-transform: uppercase;">📋 Asignación de Orden de Trabajo</h1>
      <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">InfraManager - Soporte Técnico</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; color: #334155;">Estimado(a) ${data.tecnico ? `<strong>${tecnicoSafe}</strong>` : 'técnico(a)'}:</p>
      <p style="font-size: 14px; color: #334155;">Se le ha asignado una nueva orden de trabajo para dar resolución a la siguiente incidencia:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; width: 35%;">ID Orden:</td>
          <td style="padding: 10px; font-weight: bold; color: #0f172a;">${idOrdenSafe}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b;">ID Incidencia:</td>
          <td style="padding: 10px; color: #0f172a;">${idIncidenciaSafe}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b;">Título Incidencia:</td>
          <td style="padding: 10px; font-weight: bold; color: #0f172a;">${tituloSafe}</td>
        </tr>
        ${data.ubicacion ? `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b;">Ubicación:</td>
          <td style="padding: 10px; color: #0f172a;">${ubicacionSafe}</td>
        </tr>` : ''}
        ${data.diagnostico ? `
        <tr>
          <td style="padding: 10px; color: #64748b; vertical-align: top;">Diagnóstico Preliminar:</td>
          <td style="padding: 10px; color: #334155;">${diagnosticoSafe}</td>
        </tr>` : ''}
      </table>

      <p style="font-size: 14px; color: #475569;">Por favor acuda al lugar indicado o actualice el avance de la orden en el sistema una vez comenzada la intervención.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
      InfraManager - Plataforma de Gestión de Activos e Incidencias
    </div>
  </div>
</body>
</html>`;

    return this.enviarCorreo({ to: destinatario, subject: asunto, html });
  }

  async enviarNotificacionIncidenciaResuelta(
    destinatario: string,
    data: IncidenciaResueltaMailData,
  ): Promise<MailSendResult> {
    const asunto = `[ACTUALIZACIÓN] Incidencia #${data.idIncidencia.slice(0, 8)}: Estado cambiado a ${data.nuevoEstado}`;
    const idIncidenciaSafe = this.escapeHtml(data.idIncidencia);
    const tituloSafe = this.escapeHtml(data.titulo);
    const nuevoEstadoSafe = this.escapeHtml(data.nuevoEstado);
    const tecnicoSafe = this.escapeHtml(data.tecnico);
    const resolucionSafe = this.escapeHtml(data.resolucion);
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${this.escapeHtml(asunto)}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="background-color: #16a34a; color: #ffffff; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 20px; text-transform: uppercase;">✅ Incidencia Actualizada / Resuelta</h1>
      <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">InfraManager - Trazabilidad de Tickets</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; color: #334155;">Le informamos que el ticket de incidencia reportado ha actualizado su estado operativo:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; width: 35%;">ID Incidencia:</td>
          <td style="padding: 10px; font-weight: bold; color: #0f172a;">${idIncidenciaSafe}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b;">Título:</td>
          <td style="padding: 10px; font-weight: bold; color: #0f172a;">${tituloSafe}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b;">Nuevo Estado:</td>
          <td style="padding: 10px;"><span style="background: #dcfce7; color: #15803d; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${nuevoEstadoSafe}</span></td>
        </tr>
        ${data.tecnico ? `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b;">Atendido por:</td>
          <td style="padding: 10px; color: #0f172a;">${tecnicoSafe}</td>
        </tr>` : ''}
        ${data.resolucion ? `
        <tr>
          <td style="padding: 10px; color: #64748b; vertical-align: top;">Resolución / Cierre:</td>
          <td style="padding: 10px; color: #334155; line-height: 1.5;">${resolucionSafe}</td>
        </tr>` : ''}
      </table>

      <p style="font-size: 14px; color: #475569;">Agradecemos su paciencia y colaboración para mantener el funcionamiento óptimo de las instalaciones institucionales.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
      InfraManager - Sistema Institucional de Notificaciones
    </div>
  </div>
</body>
</html>`;

    return this.enviarCorreo({ to: destinatario, subject: asunto, html });
  }

  async enviarNotificacionMantenimientoPreventivo(
    destinatario: string,
    data: MantenimientoPreventivoMailData,
  ): Promise<MailSendResult> {
    const asunto = `[MANTENIMIENTO PREVENTIVO] Programación de activo: ${data.nombreActivo}`;
    const nombreActivoSafe = this.escapeHtml(data.nombreActivo);
    const idActivoSafe = this.escapeHtml(data.idActivo);
    const fechaProgramadaSafe = this.escapeHtml(data.fechaProgramada);
    const ubicacionSafe = this.escapeHtml(data.ubicacion);
    const observacionesSafe = this.escapeHtml(data.observaciones);
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${this.escapeHtml(asunto)}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
    <div style="background-color: #d97706; color: #ffffff; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 20px; text-transform: uppercase;">🔧 Alerta de Mantenimiento Preventivo</h1>
      <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">InfraManager - Gestión de Activos Físicos</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 15px; color: #334155;">Alerta de planificación preventiva de infraestructura y equipamiento:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b; width: 35%;">Activo:</td>
          <td style="padding: 10px; font-weight: bold; color: #0f172a;">${nombreActivoSafe}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b;">ID Activo:</td>
          <td style="padding: 10px; color: #0f172a;">${idActivoSafe}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b;">Fecha Programada:</td>
          <td style="padding: 10px; font-weight: bold; color: #b45309;">${fechaProgramadaSafe}</td>
        </tr>
        ${data.ubicacion ? `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 10px; color: #64748b;">Ubicación:</td>
          <td style="padding: 10px; color: #0f172a;">${ubicacionSafe}</td>
        </tr>` : ''}
        ${data.observaciones ? `
        <tr>
          <td style="padding: 10px; color: #64748b; vertical-align: top;">Observaciones:</td>
          <td style="padding: 10px; color: #334155;">${observacionesSafe}</td>
        </tr>` : ''}
      </table>

      <p style="font-size: 14px; color: #475569;">Se recuerda realizar la verificación correspondiente para evitar interrupciones en la disponibilidad del activo.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
      InfraManager - Plataforma Institucional
    </div>
  </div>
</body>
</html>`;

    return this.enviarCorreo({ to: destinatario, subject: asunto, html });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  }
}
