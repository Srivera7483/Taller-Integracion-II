import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { RabbitmqPublisherService } from '../rabbitmq/rabbitmq-publisher.service';
import {
  NotificacionEventoDto,
  PrioridadNotificacion,
  TipoNotificacion,
} from '../rabbitmq/dto/notificacion-evento.dto';
import { AuditoriaEventoDto } from '../rabbitmq/dto/auditoria-evento.dto';

describe('NotificacionesController', () => {
  let controller: NotificacionesController;
  let serviceMock: jest.Mocked<Partial<NotificacionesService>>;
  let publisherMock: jest.Mocked<Partial<RabbitmqPublisherService>>;

  beforeEach(() => {
    serviceMock = {
      notificar: jest.fn().mockResolvedValue({
        status: 'enviada',
        idNotificacion: 'notif-1',
        fallback: false,
      }),
      procesarIncidenciaCritica: jest.fn().mockResolvedValue({
        status: 'enviada',
        idNotificacion: 'notif-2',
        fallback: false,
      }),
      procesarOrdenAsignada: jest.fn().mockResolvedValue({
        status: 'enviada',
        idNotificacion: 'notif-3',
        fallback: false,
      }),
      procesarIncidenciaResuelta: jest.fn().mockResolvedValue({
        status: 'enviada',
        idNotificacion: 'notif-4',
        fallback: false,
      }),
      procesarMantenimientoPreventivo: jest.fn().mockResolvedValue({
        status: 'enviada',
        idNotificacion: 'notif-5',
        fallback: false,
      }),
    };

    publisherMock = {
      publicarNotificacion: jest.fn().mockResolvedValue(true),
      publicarAuditoria: jest.fn().mockResolvedValue(true),
    };

    controller = new NotificacionesController(
      serviceMock as unknown as NotificacionesService,
      publisherMock as unknown as RabbitmqPublisherService,
    );
  });

  describe('Endpoints REST', () => {
    it('POST /notificar debe delegar en NotificacionesService.notificar', async () => {
      const dto = {
        email: 'test@institucion.edu',
        asunto: 'Hola',
        cuerpoMensaje: 'Contenido',
      };

      const res = await controller.notificar(dto);

      expect(serviceMock.notificar).toHaveBeenCalledWith(dto);
      expect(res).toEqual({
        status: 'enviada',
        idNotificacion: 'notif-1',
        fallback: false,
      });
    });

    it('POST /eventos/notificaciones debe publicar vía RabbitmqPublisherService', async () => {
      const dto: NotificacionEventoDto = {
        tipo: TipoNotificacion.EMAIL,
        prioridad: PrioridadNotificacion.ALTA,
        asunto: 'Evento Notif',
        cuerpo: 'Cuerpo',
        destinatario: { usuarioId: 'u1', canal: 'email' },
      };

      const res = await controller.enviarNotificacion(dto);

      expect(publisherMock.publicarNotificacion).toHaveBeenCalledWith(
        'notificacion.envio',
        dto,
      );
      expect(res).toEqual({ status: 'publicado' });
    });

    it('POST /eventos/auditoria debe publicar vía RabbitmqPublisherService', async () => {
      const dto: AuditoriaEventoDto = {
        accion: 'ACTUALIZACION',
        entidad: 'Incidencia',
        idEntidad: 'inc-1',
        usuarioId: 'u1',
      };

      const res = await controller.enviarAuditoria(dto);

      expect(publisherMock.publicarAuditoria).toHaveBeenCalledWith(
        'auditoria.registro',
        dto,
      );
      expect(res).toEqual({ status: 'publicado' });
    });

    it('POST /notificaciones/incidencias/critica debe despachar crítica', async () => {
      const payload = { id_incidencia: 'inc-1', titulo: 'Alerta' };
      const res = await controller.dispararIncidenciaCritica(payload);

      expect(serviceMock.procesarIncidenciaCritica).toHaveBeenCalledWith(
        payload,
      );
      expect(res.status).toBe('enviada');
    });

    it('POST /notificaciones/ordenes/asignada debe despachar orden asignada', async () => {
      const payload = { id_orden: 'ord-1', id_incidencia: 'inc-1' };
      const res = await controller.dispararOrdenAsignada(payload);

      expect(serviceMock.procesarOrdenAsignada).toHaveBeenCalledWith(payload);
      expect(res.status).toBe('enviada');
    });

    it('POST /notificaciones/incidencias/resuelta debe despachar resuelta', async () => {
      const payload = { id_incidencia: 'inc-1', estado: 'RESUELTO' };
      const res = await controller.dispararIncidenciaResuelta(payload);

      expect(serviceMock.procesarIncidenciaResuelta).toHaveBeenCalledWith(
        payload,
      );
      expect(res.status).toBe('enviada');
    });

    it('POST /notificaciones/activos/mantenimiento-preventivo debe despachar mantenimiento', async () => {
      const payload = { id_activo: 'act-1', nombreActivo: 'Servidor' };
      const res = await controller.dispararMantenimientoPreventivo(payload);

      expect(serviceMock.procesarMantenimientoPreventivo).toHaveBeenCalledWith(
        payload,
      );
      expect(res.status).toBe('enviada');
    });
  });

  describe('Consumidores EventPattern de RabbitMQ (Control Estricto de ACK/NACK)', () => {
    it('recibirIncidenciaCritica debe confirmar (ack) ÚNICAMENTE en caso de éxito', async () => {
      const payload = { id_incidencia: 'crit-99', titulo: 'Fuego' };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => ({ content: Buffer.from('msg') }),
      };

      await controller.recibirIncidenciaCritica(payload, mockContext);

      expect(serviceMock.procesarIncidenciaCritica).toHaveBeenCalledWith(
        payload,
      );
      expect(ackMock).toHaveBeenCalledTimes(1);
      expect(nackMock).not.toHaveBeenCalled();
    });

    it('recibirIncidenciaCritica debe hacer NACK y NO hacer ACK si el procesamiento falla', async () => {
      serviceMock.procesarIncidenciaCritica!.mockResolvedValueOnce({
        status: 'fallida',
        error: 'Error de servidor SMTP',
        fallback: false,
      });

      const payload = { id_incidencia: 'crit-99', titulo: 'Fuego' };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => ({ content: Buffer.from('msg') }),
      };

      await controller.recibirIncidenciaCritica(payload, mockContext);

      expect(ackMock).not.toHaveBeenCalled();
      expect(nackMock).toHaveBeenCalledWith(expect.any(Object), false, false);
    });

    it('recibirIncidenciaActualizada debe procesar orden asignada cuando tiene id_orden e id_tecnico', async () => {
      const payload = {
        id_incidencia: 'inc-10',
        id_orden: 'ord-10',
        id_tecnico: 'tec-10',
      };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => ({ content: Buffer.from('msg') }),
      };

      await controller.recibirIncidenciaActualizada(payload, mockContext);

      expect(serviceMock.procesarOrdenAsignada).toHaveBeenCalledWith(payload);
      expect(ackMock).toHaveBeenCalledTimes(1);
      expect(nackMock).not.toHaveBeenCalled();
    });

    it('recibirIncidenciaActualizada debe procesar resolución si el estado es resolutivo (RESUELTA)', async () => {
      const payload = {
        id_incidencia: 'inc-10',
        nombre_estado: 'RESUELTA',
      };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => ({ content: Buffer.from('msg') }),
      };

      await controller.recibirIncidenciaActualizada(payload, mockContext);

      expect(serviceMock.procesarIncidenciaResuelta).toHaveBeenCalledWith(
        payload,
      );
      expect(ackMock).toHaveBeenCalledTimes(1);
      expect(nackMock).not.toHaveBeenCalled();
    });

    it('recibirIncidenciaActualizada NO debe procesar resolución ante cambios no resolutivos (ej. EN_PROCESO)', async () => {
      const payload = {
        id_incidencia: 'inc-10',
        nuevo_estado: 'EN_PROCESO',
      };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => ({ content: Buffer.from('msg') }),
      };

      await controller.recibirIncidenciaActualizada(payload, mockContext);

      expect(serviceMock.procesarIncidenciaResuelta).not.toHaveBeenCalled();
      expect(serviceMock.procesarOrdenAsignada).not.toHaveBeenCalled();
      expect(ackMock).toHaveBeenCalledTimes(1); // Descartado limpiamente
      expect(nackMock).not.toHaveBeenCalled();
    });

    it('recibirIncidenciaActualizada debe hacer NACK si el despacho de resolución falla', async () => {
      serviceMock.procesarIncidenciaResuelta!.mockResolvedValueOnce({
        status: 'fallida',
        error: 'DB Down',
        fallback: false,
      });

      const payload = {
        id_incidencia: 'inc-10',
        nombre_estado: 'CERRADA',
      };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => ({ content: Buffer.from('msg') }),
      };

      await controller.recibirIncidenciaActualizada(payload, mockContext);

      expect(ackMock).not.toHaveBeenCalled();
      expect(nackMock).toHaveBeenCalledWith(expect.any(Object), false, false);
    });
  });
});
