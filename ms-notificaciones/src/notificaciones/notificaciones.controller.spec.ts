import { ConfigService } from '@nestjs/config';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { RabbitmqPublisherService } from '../rabbitmq/rabbitmq-publisher.service';
import { RabbitmqConsumerService } from '../rabbitmq/rabbitmq-consumer.service';
import {
  NotificacionEventoDto,
  PrioridadNotificacion,
  TipoNotificacion,
} from '../rabbitmq/dto/notificacion-evento.dto';
import {
  AuditoriaEventoDto,
  TipoAccionAuditoria,
} from '../rabbitmq/dto/auditoria-evento.dto';

describe('NotificacionesController', () => {
  let controller: NotificacionesController;
  let serviceMock: Record<string, jest.Mock>;
  let publisherMock: Record<string, jest.Mock>;
  let consumerServiceMock: Record<string, jest.Mock>;
  let configServiceMock: { get: jest.Mock };

  beforeEach(() => {
    serviceMock = {
      notificar: jest.fn().mockResolvedValue({
        status: 'enviada',
        idNotificacion: 'notif-1',
        fallback: false,
        transient: false,
      }),
      procesarIncidenciaCritica: jest.fn().mockResolvedValue({
        status: 'enviada',
        idNotificacion: 'notif-2',
        fallback: false,
        transient: false,
      }),
      procesarOrdenAsignada: jest.fn().mockResolvedValue({
        status: 'enviada',
        idNotificacion: 'notif-3',
        fallback: false,
        transient: false,
      }),
      procesarIncidenciaResuelta: jest.fn().mockResolvedValue({
        status: 'enviada',
        idNotificacion: 'notif-4',
        fallback: false,
        transient: false,
      }),
      procesarMantenimientoPreventivo: jest.fn().mockResolvedValue({
        status: 'enviada',
        idNotificacion: 'notif-5',
        fallback: false,
        transient: false,
      }),
    };

    publisherMock = {
      publicarNotificacion: jest.fn().mockResolvedValue(true),
      publicarAuditoria: jest.fn().mockResolvedValue(true),
    };

    consumerServiceMock = {
      republicarConConfirmacion: jest.fn().mockResolvedValue(true),
    };

    configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'RABBITMQ_MAX_RETRIES') return '3';
        return undefined;
      }),
    };

    controller = new NotificacionesController(
      serviceMock as unknown as NotificacionesService,
      publisherMock as unknown as RabbitmqPublisherService,
      configServiceMock as unknown as ConfigService,
      consumerServiceMock as unknown as RabbitmqConsumerService,
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
        transient: false,
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
        accion: TipoAccionAuditoria.ACTUALIZACION,
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

  describe('Consumidores EventPattern de RabbitMQ (ConfirmChannel y DLQ)', () => {
    it('recibirIncidenciaCritica debe confirmar (ack) ÚNICAMENTE en caso de éxito', async () => {
      const payload = { id_incidencia: 'crit-99', titulo: 'Fuego' };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockMsg = {
        content: Buffer.from(JSON.stringify(payload)),
        properties: { headers: { 'x-retry-count': 0 } },
        fields: { exchange: 'uct.activos.events', routingKey: 'incidencias_criticas' },
      };
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => mockMsg,
      };

      await controller.recibirIncidenciaCritica(payload, mockContext);

      expect(serviceMock.procesarIncidenciaCritica).toHaveBeenCalledWith(payload);
      expect(ackMock).toHaveBeenCalledWith(mockMsg);
      expect(nackMock).not.toHaveBeenCalled();
    });

    it('recibirIncidenciaCritica debe republicar con ConfirmChannel y confirmar (ack) si broker acepta el reintento transitorio', async () => {
      serviceMock.procesarIncidenciaCritica.mockResolvedValueOnce({
        status: 'fallida',
        error: 'ETIMEDOUT connecting to SMTP server',
        fallback: false,
        transient: true,
      });

      const payload = { id_incidencia: 'crit-99', titulo: 'Fuego' };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockMsg = {
        content: Buffer.from(JSON.stringify(payload)),
        properties: { headers: { 'x-retry-count': 0 } },
        fields: { exchange: 'uct.activos.events', routingKey: 'incidencias_criticas' },
      };
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => mockMsg,
      };

      await controller.recibirIncidenciaCritica(payload, mockContext);

      expect(consumerServiceMock.republicarConConfirmacion).toHaveBeenCalledWith(
        'uct.activos.events',
        'incidencias_criticas',
        mockMsg.content,
        mockMsg.properties,
        1, // nuevo retry count: 0 + 1
      );
      expect(ackMock).toHaveBeenCalledWith(mockMsg);
      expect(nackMock).not.toHaveBeenCalled();
    });

    it('recibirIncidenciaCritica debe hacer NACK hacia DLQ sin ACK si la confirmación de republicación falla', async () => {
      serviceMock.procesarIncidenciaCritica.mockResolvedValueOnce({
        status: 'fallida',
        error: 'ETIMEDOUT connecting to SMTP server',
        fallback: false,
        transient: true,
      });
      consumerServiceMock.republicarConConfirmacion.mockResolvedValueOnce(false); // Broker NACK / fallo

      const payload = { id_incidencia: 'crit-99', titulo: 'Fuego' };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockMsg = {
        content: Buffer.from(JSON.stringify(payload)),
        properties: { headers: { 'x-retry-count': 1 } },
        fields: { exchange: 'uct.activos.events', routingKey: 'incidencias_criticas' },
      };
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => mockMsg,
      };

      await controller.recibirIncidenciaCritica(payload, mockContext);

      expect(ackMock).not.toHaveBeenCalled();
      expect(nackMock).toHaveBeenCalledWith(mockMsg, false, false);
    });

    it('recibirIncidenciaCritica debe derivar a DLQ cuando se agotan los reintentos (retryCount >= maxRetries)', async () => {
      serviceMock.procesarIncidenciaCritica.mockResolvedValueOnce({
        status: 'fallida',
        error: 'ETIMEDOUT connecting to SMTP server',
        fallback: false,
        transient: true,
      });

      const payload = { id_incidencia: 'crit-99', titulo: 'Fuego' };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockMsg = {
        content: Buffer.from(JSON.stringify(payload)),
        properties: { headers: { 'x-retry-count': 3 } }, // maxRetries es 3
        fields: { exchange: 'uct.activos.events', routingKey: 'incidencias_criticas' },
      };
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => mockMsg,
      };

      await controller.recibirIncidenciaCritica(payload, mockContext);

      expect(consumerServiceMock.republicarConConfirmacion).not.toHaveBeenCalled();
      expect(ackMock).not.toHaveBeenCalled();
      expect(nackMock).toHaveBeenCalledWith(mockMsg, false, false);
    });

    it('recibirIncidenciaCritica debe derivar a DLQ directamente ante error permanente (transient=false)', async () => {
      serviceMock.procesarIncidenciaCritica.mockResolvedValueOnce({
        status: 'fallida',
        error: 'Destinatario no especificado o formato inválido',
        fallback: false,
        transient: false,
      });

      const payload = { id_incidencia: 'crit-99', titulo: 'Fuego' };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockMsg = {
        content: Buffer.from(JSON.stringify(payload)),
        properties: { headers: { 'x-retry-count': 0 } },
        fields: { exchange: 'uct.activos.events', routingKey: 'incidencias_criticas' },
      };
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => mockMsg,
      };

      await controller.recibirIncidenciaCritica(payload, mockContext);

      expect(consumerServiceMock.republicarConConfirmacion).not.toHaveBeenCalled();
      expect(ackMock).not.toHaveBeenCalled();
      expect(nackMock).toHaveBeenCalledWith(mockMsg, false, false);
    });

    it('recibirIncidenciaActualizada debe procesar orden asignada cuando tiene id_orden e id_tecnico', async () => {
      const payload = {
        id_incidencia: 'inc-10',
        id_orden: 'ord-10',
        id_tecnico: 'tec-10',
      };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockMsg = {
        content: Buffer.from(JSON.stringify(payload)),
        properties: { headers: { 'x-retry-count': 0 } },
        fields: { exchange: 'uct.activos.events', routingKey: 'incidencia_actualizada' },
      };
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => mockMsg,
      };

      await controller.recibirIncidenciaActualizada(payload, mockContext);

      expect(serviceMock.procesarOrdenAsignada).toHaveBeenCalledWith(payload);
      expect(ackMock).toHaveBeenCalledWith(mockMsg);
      expect(nackMock).not.toHaveBeenCalled();
    });

    it('recibirIncidenciaActualizada debe procesar resolución si el estado es resolutivo (RESUELTA)', async () => {
      const payload = {
        id_incidencia: 'inc-10',
        nombre_estado: 'RESUELTA',
      };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockMsg = {
        content: Buffer.from(JSON.stringify(payload)),
        properties: { headers: { 'x-retry-count': 0 } },
        fields: { exchange: 'uct.activos.events', routingKey: 'incidencia_actualizada' },
      };
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => mockMsg,
      };

      await controller.recibirIncidenciaActualizada(payload, mockContext);

      expect(serviceMock.procesarIncidenciaResuelta).toHaveBeenCalledWith(payload);
      expect(ackMock).toHaveBeenCalledWith(mockMsg);
      expect(nackMock).not.toHaveBeenCalled();
    });

    it('recibirIncidenciaActualizada NO debe procesar resolución ante cambios no resolutivos y debe descartar limpiamente con ACK', async () => {
      const payload = {
        id_incidencia: 'inc-10',
        nuevo_estado: 'EN_PROCESO',
      };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockMsg = {
        content: Buffer.from(JSON.stringify(payload)),
        properties: { headers: { 'x-retry-count': 0 } },
        fields: { exchange: 'uct.activos.events', routingKey: 'incidencia_actualizada' },
      };
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => mockMsg,
      };

      await controller.recibirIncidenciaActualizada(payload, mockContext);

      expect(serviceMock.procesarIncidenciaResuelta).not.toHaveBeenCalled();
      expect(serviceMock.procesarOrdenAsignada).not.toHaveBeenCalled();
      expect(ackMock).toHaveBeenCalledWith(mockMsg); // Descartado limpiamente
      expect(nackMock).not.toHaveBeenCalled();
    });

    it('recibirIncidenciaActualizada debe derivar a DLQ si el despacho de resolución falla con error no transitorio', async () => {
      serviceMock.procesarIncidenciaResuelta.mockResolvedValueOnce({
        status: 'fallida',
        error: 'Sin destinatario real',
        fallback: false,
        transient: false,
      });

      const payload = {
        id_incidencia: 'inc-10',
        nombre_estado: 'CERRADA',
      };
      const ackMock = jest.fn();
      const nackMock = jest.fn();
      const mockMsg = {
        content: Buffer.from(JSON.stringify(payload)),
        properties: { headers: { 'x-retry-count': 0 } },
        fields: { exchange: 'uct.activos.events', routingKey: 'incidencia_actualizada' },
      };
      const mockContext = {
        getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
        getMessage: () => mockMsg,
      };

      await controller.recibirIncidenciaActualizada(payload, mockContext);

      expect(ackMock).not.toHaveBeenCalled();
      expect(nackMock).toHaveBeenCalledWith(mockMsg, false, false);
    });
  });
});
