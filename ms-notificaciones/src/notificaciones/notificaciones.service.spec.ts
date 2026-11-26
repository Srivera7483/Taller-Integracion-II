import { ConfigService } from '@nestjs/config';
import { NotificacionesService } from './notificaciones.service';
import { MailService } from '../mail/mail.service';
import {
  NotificacionEventoDto,
  PrioridadNotificacion,
  TipoNotificacion as DtoTipoNotificacion,
} from '../rabbitmq/dto/notificacion-evento.dto';

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let mailServiceMock: any;
  let configServiceMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mailServiceMock = {
      enviarCorreo: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'mock-msg-1',
        isFallback: false,
      }),
      enviarNotificacionIncidenciaCritica: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'mock-msg-2',
        isFallback: false,
      }),
      enviarNotificacionOrdenAsignada: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'mock-msg-3',
        isFallback: false,
      }),
      enviarNotificacionIncidenciaResuelta: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'mock-msg-4',
        isFallback: false,
      }),
      enviarNotificacionMantenimientoPreventivo: jest.fn().mockResolvedValue({
        success: true,
        messageId: 'mock-msg-5',
        isFallback: false,
      }),
      isFallback: jest.fn().mockReturnValue(false),
    };

    configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'MAIL_ALERTAS_CRITICAS') return 'guardia-oficial@institucion.edu';
        if (key === 'MAIL_ALERTAS_MANTENIMIENTO') return 'mantenimiento-oficial@institucion.edu';
        return undefined;
      }),
    };

    service = new NotificacionesService(
      mailServiceMock as unknown as MailService,
      configServiceMock as unknown as ConfigService,
    );
  });

  describe('notificar (REST)', () => {
    it('debe registrar logs estructurados y despachar correo con destinatario real', async () => {
      const loggerSpy = jest.spyOn((service as any).logger, 'log');
      const dto = {
        email: 'usuario.real@institucion.edu',
        asunto: 'Bienvenido',
        cuerpoMensaje: 'Cuerpo del mensaje institucional',
      };

      const result = await service.notificar(dto);

      expect(mailServiceMock.enviarCorreo).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('enviada');
      expect(result.fallback).toBe(false);
      expect(result.transient).toBe(false);
      expect(loggerSpy).toHaveBeenCalled();
      const lastCall = String(loggerSpy.mock.calls[loggerSpy.mock.calls.length - 1][0]);
      const jsonStart = lastCall.indexOf('{');
      const logData = JSON.parse(lastCall.substring(jsonStart));
      expect(logData.destinatario).toBe(dto.email);
      expect(logData.estado).toBe('ENVIADO');
    });

    it('debe registrar estado SIMULADO cuando opera en fallback seguro de desarrollo', async () => {
      mailServiceMock.enviarCorreo.mockResolvedValueOnce({
        success: true,
        messageId: 'mock-msg-sim',
        isFallback: true,
      });

      const dto = {
        email: 'usuario.dev@institucion.edu',
        asunto: 'Test Fallback',
        cuerpoMensaje: 'Cuerpo',
      };

      const result = await service.notificar(dto);

      expect(result.status).toBe('enviada');
      expect(result.fallback).toBe(true);
      expect(result.transient).toBe(false);
    });

    it('debe marcar error transitorio ante fallos temporales de red o timeout SMTP', async () => {
      mailServiceMock.enviarCorreo.mockResolvedValueOnce({
        success: false,
        error: 'ETIMEDOUT connection to smtp.institucion.edu timed out',
        isFallback: false,
      });

      const dto = {
        email: 'usuario.real@institucion.edu',
        asunto: 'Timeout',
        cuerpoMensaje: 'Cuerpo',
      };

      const result = await service.notificar(dto);

      expect(result.status).toBe('fallida');
      expect(result.transient).toBe(true);
    });

    it('debe rechazar correos con destinatario inválido sin enviar correo y marcar como no transitorio', async () => {
      const dto = {
        email: 'correo-invalido-sin-arroba',
        asunto: 'Test Invalido',
        cuerpoMensaje: 'Cuerpo',
      };

      const result = await service.notificar(dto);

      expect(result.status).toBe('fallida');
      expect(result.transient).toBe(false);
      expect(result.error).toContain('Formato de correo destinatario inválido');
      expect(mailServiceMock.enviarCorreo).not.toHaveBeenCalled();
    });
  });

  describe('procesarIncidenciaCritica', () => {
    it('debe despachar alerta crítica con correo real en payload', async () => {
      const evento = {
        id_incidencia: 'inc-1234-abcd',
        titulo: 'Fallo general eléctrico',
        descripcion: 'Corte en ala norte',
        email: 'director.operaciones@institucion.edu',
      };

      const result = await service.procesarIncidenciaCritica(evento);

      expect(
        mailServiceMock.enviarNotificacionIncidenciaCritica,
      ).toHaveBeenCalledWith(
        'director.operaciones@institucion.edu',
        expect.objectContaining({
          idIncidencia: 'inc-1234-abcd',
          titulo: 'Fallo general eléctrico',
        }),
      );
      expect(result.status).toBe('enviada');
      expect(result.transient).toBe(false);
    });

    it('debe usar MAIL_ALERTAS_CRITICAS institucional si evento no provee email', async () => {
      const evento = {
        id_incidencia: 'inc-1234-abcd',
        titulo: 'Fallo general eléctrico',
        descripcion: 'Corte en ala norte',
      };

      const result = await service.procesarIncidenciaCritica(evento);

      expect(
        mailServiceMock.enviarNotificacionIncidenciaCritica,
      ).toHaveBeenCalledWith(
        'guardia-oficial@institucion.edu',
        expect.any(Object),
      );
      expect(result.status).toBe('enviada');
    });

    it('debe rechazar y registrar fallo permanente si no hay ningún correo destinatario real', async () => {
      configServiceMock.get.mockReturnValue(undefined); // Sin MAIL_ALERTAS_CRITICAS
      const evento = {
        id_incidencia: 'inc-1234-abcd',
        titulo: 'Fallo sin destinatario',
        descripcion: 'Detalle',
      };

      const result = await service.procesarIncidenciaCritica(evento);

      expect(result.status).toBe('fallida');
      expect(result.transient).toBe(false);
      expect(result.error).toContain('evitar destinatarios ficticios');
      expect(
        mailServiceMock.enviarNotificacionIncidenciaCritica,
      ).not.toHaveBeenCalled();
    });

    it('debe marcar transient=true si el error SMTP es ECONNREFUSED', async () => {
      mailServiceMock.enviarNotificacionIncidenciaCritica.mockResolvedValueOnce({
        success: false,
        error: 'connect ECONNREFUSED 127.0.0.1:587',
        isFallback: false,
      });

      const evento = {
        id_incidencia: 'inc-1234-abcd',
        titulo: 'Fallo general eléctrico',
        email: 'director@institucion.edu',
      };

      const result = await service.procesarIncidenciaCritica(evento);

      expect(result.status).toBe('fallida');
      expect(result.transient).toBe(true);
    });
  });

  describe('procesarOrdenAsignada', () => {
    it('debe notificar asignación al técnico con email real', async () => {
      const evento = {
        id_orden: 'ord-5678',
        id_incidencia: 'inc-1234',
        titulo: 'Reparación de red',
        emailTecnico: 'tecnico.real@institucion.edu',
        tecnico: 'Carlos Ruiz',
      };

      const result = await service.procesarOrdenAsignada(evento);

      expect(
        mailServiceMock.enviarNotificacionOrdenAsignada,
      ).toHaveBeenCalledWith(
        'tecnico.real@institucion.edu',
        expect.objectContaining({
          idOrden: 'ord-5678',
          idIncidencia: 'inc-1234',
          tecnico: 'Carlos Ruiz',
        }),
      );
      expect(result.status).toBe('enviada');
      expect(result.transient).toBe(false);
    });

    it('debe rechazar el envío como no transitorio si falta el correo del técnico asignado', async () => {
      const evento = {
        id_orden: 'ord-5678',
        id_incidencia: 'inc-1234',
        titulo: 'Sin email técnico',
      };

      const result = await service.procesarOrdenAsignada(evento);

      expect(result.status).toBe('fallida');
      expect(result.transient).toBe(false);
      expect(result.error).toContain('evitar destinatarios ficticios');
      expect(
        mailServiceMock.enviarNotificacionOrdenAsignada,
      ).not.toHaveBeenCalled();
    });
  });

  describe('procesarIncidenciaResuelta', () => {
    it('debe notificar resolución de ticket cuando el estado es efectivamente RESUELTA', async () => {
      const evento = {
        id_incidencia: 'inc-9999',
        titulo: 'Aire acondicionado no enfría',
        nombre_estado: 'RESUELTA',
        emailReportante: 'profesor@institucion.edu',
        resolucion: 'Carga de gas refrigerante completada',
      };

      const result = await service.procesarIncidenciaResuelta(evento);

      expect(
        mailServiceMock.enviarNotificacionIncidenciaResuelta,
      ).toHaveBeenCalledWith(
        'profesor@institucion.edu',
        expect.objectContaining({
          idIncidencia: 'inc-9999',
          nuevoEstado: 'RESUELTA',
        }),
      );
      expect(result.status).toBe('enviada');
      expect(result.transient).toBe(false);
    });

    it('debe RECHAZAR la notificación como fallo permanente si el estado es EN_PROCESO u otro no resolutivo', async () => {
      const evento = {
        id_incidencia: 'inc-9999',
        titulo: 'Ticket en proceso',
        nombre_estado: 'EN_PROCESO',
        emailReportante: 'profesor@institucion.edu',
      };

      const result = await service.procesarIncidenciaResuelta(evento);

      expect(result.status).toBe('fallida');
      expect(result.transient).toBe(false);
      expect(result.error).toContain('no corresponde a una resolución o cierre');
      expect(
        mailServiceMock.enviarNotificacionIncidenciaResuelta,
      ).not.toHaveBeenCalled();
    });

    it('debe rechazar como no transitorio si falta el correo del reportante', async () => {
      const evento = {
        id_incidencia: 'inc-9999',
        nombre_estado: 'CERRADA',
      };

      const result = await service.procesarIncidenciaResuelta(evento);

      expect(result.status).toBe('fallida');
      expect(result.transient).toBe(false);
      expect(result.error).toContain('evitar destinatarios ficticios');
    });
  });

  describe('procesarMantenimientoPreventivo', () => {
    it('debe notificar mantenimiento preventivo con correo de responsable', async () => {
      const evento = {
        id_activo: 'act-3333',
        nombreActivo: 'Servidor Dell PowerEdge',
        fechaProgramada: '2026-11-25',
        emailResponsable: 'admin-it@institucion.edu',
      };

      const result = await service.procesarMantenimientoPreventivo(evento);

      expect(
        mailServiceMock.enviarNotificacionMantenimientoPreventivo,
      ).toHaveBeenCalledWith(
        'admin-it@institucion.edu',
        expect.objectContaining({
          idActivo: 'act-3333',
        }),
      );
      expect(result.status).toBe('enviada');
      expect(result.transient).toBe(false);
    });

    it('debe rechazar como fallo permanente si no hay email de responsable ni MAIL_ALERTAS_MANTENIMIENTO', async () => {
      configServiceMock.get.mockReturnValue(undefined);
      const evento = {
        id_activo: 'act-3333',
        nombreActivo: 'Servidor',
      };

      const result = await service.procesarMantenimientoPreventivo(evento);

      expect(result.status).toBe('fallida');
      expect(result.transient).toBe(false);
      expect(result.error).toContain('evitar destinatarios ficticios');
    });
  });

  describe('procesarEventoNotificacion (RabbitMQ)', () => {
    it('debe enrutar evento con metadata INCIDENCIA_CRITICA', async () => {
      const spy = jest.spyOn(service, 'procesarIncidenciaCritica');
      const dto: NotificacionEventoDto = {
        tipo: DtoTipoNotificacion.EMAIL,
        prioridad: PrioridadNotificacion.CRITICA,
        asunto: 'Incidencia Crítica Test',
        cuerpo: 'Detalle',
        destinatario: { usuarioId: 'u1', canal: 'email', direccion: 'admin@institucion.edu' },
        metadata: { evento: 'INCIDENCIA_CRITICA', id_incidencia: 'inc-1' },
      };

      await service.procesarEventoNotificacion(dto);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('debe rechazar evento genérico sin destinatario válido', async () => {
      const dto: NotificacionEventoDto = {
        tipo: DtoTipoNotificacion.EMAIL,
        prioridad: PrioridadNotificacion.BAJA,
        asunto: 'Genérico',
        cuerpo: 'Detalle',
        destinatario: { usuarioId: 'u1', canal: 'email' },
      };

      const res = await service.procesarEventoNotificacion(dto);

      expect(res.status).toBe('fallida');
      expect(res.transient).toBe(false);
      expect(res.error).toContain('destinatario de correo válido');
    });
  });
});
