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

    service = new NotificacionesService(
      prismaMock as unknown as PrismaService,
      mailServiceMock as unknown as MailService,
    );
  });

  describe('notificar (REST)', () => {
    it('debe enviar correo directo y persistir trazabilidad ENVIADO en BD', async () => {
      const dto = {
        email: 'usuario@institucion.edu',
        asunto: 'Bienvenido',
        cuerpoMensaje: 'Cuerpo del mensaje',
      };

      const result = await service.notificar(dto);

      expect(mailServiceMock.enviarCorreo).toHaveBeenCalledTimes(1);
      expect(prismaMock.notificacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            destinatario: dto.email,
            asunto: dto.asunto,
            estado: 'ENVIADO',
          }),
        }),
      );
      expect(result.status).toBe('enviada');
      expect(result.idNotificacion).toBe('mock-uuid-notificacion');
    });

    it('debe persistir estado FALLIDO si el envío de correo falla', async () => {
      mailServiceMock.enviarCorreo.mockResolvedValueOnce({
        success: false,
        error: 'Conexión rechazada por servidor SMTP',
        isFallback: false,
      });

      const dto = {
        email: 'usuario@institucion.edu',
        asunto: 'Error Mail',
        cuerpoMensaje: 'Prueba',
      };

      const result = await service.notificar(dto);

      expect(result.status).toBe('fallida');
      expect(prismaMock.notificacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            estado: 'FALLIDO',
            error: 'Conexión rechazada por servidor SMTP',
          }),
        }),
      );
    });

    it('debe tolerar que la base de datos esté desconectada sin derribar el servicio', async () => {
      prismaMock.connected = false;

      const dto = {
        email: 'usuario@institucion.edu',
        asunto: 'Sin BD',
        cuerpoMensaje: 'Prueba sin BD',
      };

      const result = await service.notificar(dto);

      expect(result.status).toBe('enviada');
      expect(prismaMock.notificacion.create).not.toHaveBeenCalled();
    });
  });

  describe('procesarIncidenciaCritica', () => {
    it('debe despachar correo crítico y registrar en NOTIFICACIONES', async () => {
      const evento = {
        id_incidencia: 'inc-1234-abcd',
        titulo: 'Fallo general eléctrico',
        descripcion: 'Corte en ala norte',
        destinatario: { direccion: 'guardia@institucion.edu' },
      };

      const result = await service.procesarIncidenciaCritica(evento);

      expect(
        mailServiceMock.enviarNotificacionIncidenciaCritica,
      ).toHaveBeenCalledWith(
        'guardia@institucion.edu',
        expect.objectContaining({
          idIncidencia: 'inc-1234-abcd',
          titulo: 'Fallo general eléctrico',
        }),
      );
      expect(prismaMock.notificacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            evento: 'INCIDENCIA_CRITICA',
            id_referencia: 'inc-1234-abcd',
          }),
        }),
      );
      expect(result.status).toBe('enviada');
    });
  });

  describe('procesarOrdenAsignada', () => {
    it('debe notificar asignación a técnico y registrar en NOTIFICACIONES', async () => {
      const evento = {
        id_orden: 'ord-5678',
        id_incidencia: 'inc-1234',
        titulo: 'Reparación de red',
        emailTecnico: 'tecnico@institucion.edu',
        tecnico: 'Carlos Ruiz',
      };

      const result = await service.procesarOrdenAsignada(evento);

      expect(
        mailServiceMock.enviarNotificacionOrdenAsignada,
      ).toHaveBeenCalledWith(
        'tecnico@institucion.edu',
        expect.objectContaining({
          idOrden: 'ord-5678',
          idIncidencia: 'inc-1234',
          tecnico: 'Carlos Ruiz',
        }),
      );
      expect(prismaMock.notificacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            evento: 'ORDEN_ASIGNADA',
            id_referencia: 'ord-5678',
          }),
        }),
      );
      expect(result.status).toBe('enviada');
    });
  });

  describe('procesarIncidenciaResuelta', () => {
    it('debe notificar resolución de ticket y registrar en NOTIFICACIONES', async () => {
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
      expect(prismaMock.notificacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            evento: 'INCIDENCIA_RESUELTA',
            id_referencia: 'inc-9999',
          }),
        }),
      );
      expect(result.status).toBe('enviada');
    });
  });

  describe('procesarMantenimientoPreventivo', () => {
    it('debe notificar alerta preventiva de activo y registrar en BD', async () => {
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
          nombreActivo: 'Servidor Dell PowerEdge',
        }),
      );
      expect(prismaMock.notificacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            evento: 'MANTENIMIENTO_PREVENTIVO',
            id_referencia: 'act-3333',
          }),
        }),
      );
      expect(result.status).toBe('enviada');
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
        destinatario: { usuarioId: 'u1', canal: 'email', direccion: 'c@i.cl' },
        metadata: { evento: 'INCIDENCIA_CRITICA', id_incidencia: 'inc-1' },
      };

      await service.procesarEventoNotificacion(dto);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('debe enrutar evento con metadata ORDEN_ASIGNADA', async () => {
      const spy = jest.spyOn(service, 'procesarOrdenAsignada');
      const dto: NotificacionEventoDto = {
        tipo: DtoTipoNotificacion.EMAIL,
        prioridad: PrioridadNotificacion.MEDIA,
        asunto: 'Orden Asignada Test',
        cuerpo: 'Detalle',
        destinatario: { usuarioId: 'u1', canal: 'email' },
        metadata: { evento: 'ORDEN_ASIGNADA', id_orden: 'ord-1' },
      };

      await service.procesarEventoNotificacion(dto);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('debe enrutar evento con metadata INCIDENCIA_RESUELTA', async () => {
      const spy = jest.spyOn(service, 'procesarIncidenciaResuelta');
      const dto: NotificacionEventoDto = {
        tipo: DtoTipoNotificacion.EMAIL,
        prioridad: PrioridadNotificacion.BAJA,
        asunto: 'Incidencia Resuelta Test',
        cuerpo: 'Detalle',
        destinatario: { usuarioId: 'u1', canal: 'email' },
        metadata: { evento: 'INCIDENCIA_RESUELTA', id_incidencia: 'inc-1' },
      };

      await service.procesarEventoNotificacion(dto);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('debe enrutar evento con metadata MANTENIMIENTO_PREVENTIVO', async () => {
      const spy = jest.spyOn(service, 'procesarMantenimientoPreventivo');
      const dto: NotificacionEventoDto = {
        tipo: DtoTipoNotificacion.EMAIL,
        prioridad: PrioridadNotificacion.ALTA,
        asunto: 'Mantenimiento Test',
        cuerpo: 'Detalle',
        destinatario: { usuarioId: 'u1', canal: 'email' },
        metadata: { evento: 'MANTENIMIENTO_PREVENTIVO', id_activo: 'act-1' },
      };

      await service.procesarEventoNotificacion(dto);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
