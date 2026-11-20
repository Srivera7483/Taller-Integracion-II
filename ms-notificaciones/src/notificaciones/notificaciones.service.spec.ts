import { ConfigService } from '@nestjs/config';
import { NotificacionesService } from './notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { createMockPrismaService } from '../../test/mocks/prisma.mock';
import {
  NotificacionEventoDto,
  PrioridadNotificacion,
  TipoNotificacion as DtoTipoNotificacion,
} from '../rabbitmq/dto/notificacion-evento.dto';

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let prismaMock: any;
  let mailServiceMock: any;
  let configServiceMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    prismaMock = createMockPrismaService();

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
      prismaMock as unknown as PrismaService,
      mailServiceMock as unknown as MailService,
      configServiceMock as unknown as ConfigService,
    );
  });

  describe('notificar (REST)', () => {
    it('debe registrar trazabilidad en dos fases (PENDIENTE -> ENVIADO) con correo real', async () => {
      const dto = {
        email: 'usuario.real@institucion.edu',
        asunto: 'Bienvenido',
        cuerpoMensaje: 'Cuerpo del mensaje',
      };

      const result = await service.notificar(dto);

      expect(prismaMock.notificacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            destinatario: dto.email,
            asunto: dto.asunto,
            estado: 'PENDIENTE',
          }),
        }),
      );
      expect(mailServiceMock.enviarCorreo).toHaveBeenCalledTimes(1);
      expect(prismaMock.notificacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'ENVIADO',
          }),
        }),
      );
      expect(result.status).toBe('enviada');
      expect(result.idNotificacion).toBe('mock-uuid-notificacion');
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
      expect(prismaMock.notificacion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'SIMULADO',
          }),
        }),
      );
    });

    it('debe abortar el envío y retornar fallida si falla la persistencia inicial en BD', async () => {
      prismaMock.notificacion.create.mockRejectedValueOnce(
        new Error('PostgreSQL Connection Refused'),
      );

      const dto = {
        email: 'usuario.real@institucion.edu',
        asunto: 'Fallo BD',
        cuerpoMensaje: 'Prueba',
      };

      const result = await service.notificar(dto);

      expect(result.status).toBe('fallida');
      expect(result.error).toContain('Fallo crítico de persistencia en NOTIFICACIONES');
      expect(mailServiceMock.enviarCorreo).not.toHaveBeenCalled();
    });

    it('debe rechazar correos con destinatario inválido sin enviar correo', async () => {
      const dto = {
        email: 'correo-invalido-sin-arroba',
        asunto: 'Test Invalido',
        cuerpoMensaje: 'Cuerpo',
      };

      const result = await service.notificar(dto);

      expect(result.status).toBe('fallida');
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

    it('debe rechazar y registrar fallo si no hay ningún correo destinatario real', async () => {
      configServiceMock.get.mockReturnValue(undefined); // Sin MAIL_ALERTAS_CRITICAS
      const evento = {
        id_incidencia: 'inc-1234-abcd',
        titulo: 'Fallo sin destinatario',
        descripcion: 'Detalle',
      };

      const result = await service.procesarIncidenciaCritica(evento);

      expect(result.status).toBe('fallida');
      expect(result.error).toContain('evitar destinatarios ficticios');
      expect(
        mailServiceMock.enviarNotificacionIncidenciaCritica,
      ).not.toHaveBeenCalled();
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
    });

    it('debe rechazar el envío si falta el correo del técnico asignado', async () => {
      const evento = {
        id_orden: 'ord-5678',
        id_incidencia: 'inc-1234',
        titulo: 'Sin email técnico',
      };

      const result = await service.procesarOrdenAsignada(evento);

      expect(result.status).toBe('fallida');
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
    });

    it('debe RECHAZAR la notificación de resolución si el estado es EN_PROCESO u otro no resolutivo', async () => {
      const evento = {
        id_incidencia: 'inc-9999',
        titulo: 'Ticket en proceso',
        nombre_estado: 'EN_PROCESO',
        emailReportante: 'profesor@institucion.edu',
      };

      const result = await service.procesarIncidenciaResuelta(evento);

      expect(result.status).toBe('fallida');
      expect(result.error).toContain('no corresponde a una resolución o cierre');
      expect(
        mailServiceMock.enviarNotificacionIncidenciaResuelta,
      ).not.toHaveBeenCalled();
    });

    it('debe rechazar si falta el correo del reportante', async () => {
      const evento = {
        id_incidencia: 'inc-9999',
        nombre_estado: 'CERRADA',
      };

      const result = await service.procesarIncidenciaResuelta(evento);

      expect(result.status).toBe('fallida');
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
    });

    it('debe rechazar si no hay email de responsable ni MAIL_ALERTAS_MANTENIMIENTO', async () => {
      configServiceMock.get.mockReturnValue(undefined);
      const evento = {
        id_activo: 'act-3333',
        nombreActivo: 'Servidor',
      };

      const result = await service.procesarMantenimientoPreventivo(evento);

      expect(result.status).toBe('fallida');
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
      expect(res.error).toContain('destinatario de correo válido');
    });
  });
});
