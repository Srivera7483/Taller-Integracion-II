import { ConfigService } from '@nestjs/config';
import { RabbitmqConsumerService } from './rabbitmq-consumer.service';
import { RabbitmqTopologyService } from './rabbitmq-topology.service';
import { createMockChannel, createMockConnection } from '../../test/mocks/amqplib.mock';
import amqp from 'amqplib';

describe('RabbitmqConsumerService', () => {
  let service: RabbitmqConsumerService;
  let configService: jest.Mocked<ConfigService>;
  let topologyService: jest.Mocked<RabbitmqTopologyService>;
  let mockChannel: ReturnType<typeof createMockChannel>;
  let mockConnection: ReturnType<typeof createMockConnection>;

  const configValues: Record<string, string> = {
    RABBITMQ_URL: 'amqp://guest:guest@localhost:5672',
    RABBITMQ_MAX_RETRIES: '3',
    RABBITMQ_QUEUE_NOTIFICACIONES: 'notificaciones.queue',
    RABBITMQ_QUEUE_AUDITORIA: 'auditoria.queue',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockChannel = createMockChannel();
    mockConnection = createMockConnection();
    configService = { get: jest.fn((key: string) => configValues[key] ?? undefined) } as any;
    topologyService = { declareTopology: jest.fn().mockResolvedValue(undefined) } as any;
    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);
    mockConnection.createConfirmChannel.mockResolvedValue(mockChannel);
    service = new RabbitmqConsumerService(configService, topologyService);
    (service as any).channel = mockChannel;
    (service as any).connection = mockConnection;
  });

  describe('constructor', () => {
    it('debe leer RABBITMQ_MAX_RETRIES con valor por defecto 3', () => {
      const svc = new RabbitmqConsumerService(configService, topologyService);
      expect((svc as any).maxRetries).toBe(3);
    });

    it('debe usar el valor configurado de RABBITMQ_MAX_RETRIES', () => {
      configService.get.mockImplementation((key: string) =>
        key === 'RABBITMQ_MAX_RETRIES' ? '5' : configValues[key],
      );
      const svc = new RabbitmqConsumerService(configService, topologyService);
      expect((svc as any).maxRetries).toBe(5);
    });

    it('debe configurar las colas notificaciones.queue y auditoria.queue', () => {
      const svc = new RabbitmqConsumerService(configService, topologyService);
      expect((svc as any).queues).toEqual(['notificaciones.queue', 'auditoria.queue']);
    });
  });

  describe('onModuleInit', () => {
    it('debe declarar topología antes de iniciar el consumo con ConfirmChannel', async () => {
      await service.onModuleInit();
      expect(topologyService.declareTopology).toHaveBeenCalledTimes(1);
      expect(mockConnection.createConfirmChannel).toHaveBeenCalled();
      expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
      expect(mockChannel.consume).toHaveBeenCalledTimes(2);
    });

    it('debe fallar si declareTopology lanza error', async () => {
      topologyService.declareTopology.mockRejectedValueOnce(
        new Error('Broker no disponible'),
      );
      await expect(service.onModuleInit()).rejects.toThrow('Broker no disponible');
    });
  });

  describe('start', () => {
    it('debe conectar, crear ConfirmChannel, hacer prefetch y consumir colas', async () => {
      await service.start();
      expect(amqp.connect).toHaveBeenCalledWith(
        'amqp://guest:guest@localhost:5672',
      );
      expect(mockConnection.createConfirmChannel).toHaveBeenCalled();
      expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
      expect(mockChannel.consume).toHaveBeenCalledWith(
        'notificaciones.queue',
        expect.any(Function),
      );
      expect(mockChannel.consume).toHaveBeenCalledWith(
        'auditoria.queue',
        expect.any(Function),
      );
    });
  });

  describe('republicarConConfirmacion', () => {
    it('debe retornar true cuando el broker confirma la publicación (ACK)', async () => {
      mockChannel.publish.mockImplementation(
        (exchange, routingKey, content, options, callback) => {
          callback?.(null, true);
          return true;
        },
      );

      const ok = await service.republicarConConfirmacion(
        'uct.activos.events',
        'notificacion.envio',
        Buffer.from('test'),
        { persistent: true } as any,
        1,
      );

      expect(ok).toBe(true);
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'uct.activos.events',
        'notificacion.envio',
        Buffer.from('test'),
        expect.objectContaining({
          headers: expect.objectContaining({ 'x-retry-count': 1 }),
        }),
        expect.any(Function),
      );
    });

    it('debe retornar false cuando el broker rechaza la publicación (NACK)', async () => {
      mockChannel.publish.mockImplementation(
        (exchange, routingKey, content, options, callback) => {
          callback?.(new Error('Broker NACK'));
          return true;
        },
      );

      const ok = await service.republicarConConfirmacion(
        'uct.activos.events',
        'notificacion.envio',
        Buffer.from('test'),
        { persistent: true } as any,
        1,
      );

      expect(ok).toBe(false);
    });

    it('debe retornar false si publish lanza una excepción síncrona', async () => {
      mockChannel.publish.mockImplementation(() => {
        throw new Error('Connection closed');
      });

      const ok = await service.republicarConConfirmacion(
        'uct.activos.events',
        'notificacion.envio',
        Buffer.from('test'),
        { persistent: true } as any,
        1,
      );

      expect(ok).toBe(false);
    });

    it('debe retornar false si el canal no está inicializado', async () => {
      (service as any).channel = undefined;
      const ok = await service.republicarConConfirmacion(
        'uct.activos.events',
        'notificacion.envio',
        Buffer.from('test'),
      );
      expect(ok).toBe(false);
    });
  });

  describe('process - validación de DTOs', () => {
    it('debe aceptar un NotificacionEventoDto válido en notificaciones.queue', async () => {
      const payload = JSON.stringify({
        tipo: 'EMAIL',
        prioridad: 'ALTA',
        asunto: 'Test',
        cuerpo: 'Cuerpo',
        destinatario: { usuarioId: 'u1', canal: 'email' },
      });
      const result = await (service as any).process(
        Buffer.from(payload),
        {},
        'notificaciones.queue',
      );
      expect(result.success).toBe(true);
    });

    it('debe rechazar un NotificacionEventoDto inválido en notificaciones.queue', async () => {
      const payload = JSON.stringify({ tipo: 'EMAIL' });
      await expect(
        (service as any).process(Buffer.from(payload), {}, 'notificaciones.queue'),
      ).rejects.toThrow('NotificacionEventoDto inválido');
    });

    it('debe aceptar un AuditoriaEventoDto válido en auditoria.queue', async () => {
      const payload = JSON.stringify({
        accion: 'CREACION',
        entidad: 'Activo',
        idEntidad: 'a1',
        usuarioId: 'u1',
      });
      const result = await (service as any).process(
        Buffer.from(payload),
        {},
        'auditoria.queue',
      );
      expect(result.success).toBe(true);
    });

    it('debe rechazar un AuditoriaEventoDto inválido en auditoria.queue', async () => {
      const payload = JSON.stringify({ accion: 'CREACION' });
      await expect(
        (service as any).process(Buffer.from(payload), {}, 'auditoria.queue'),
      ).rejects.toThrow('AuditoriaEventoDto inválido');
    });

    it('debe lanzar error si el payload no es JSON válido', async () => {
      await expect(
        (service as any).process(Buffer.from('no-es-json'), {}, 'notificaciones.queue'),
      ).rejects.toThrow('Payload no es un JSON válido');
    });

    it('debe aceptar cualquier cola desconocida sin validación de DTO', async () => {
      const result = await (service as any).process(
        Buffer.from('{}'),
        {},
        'otra.cola',
      );
      expect(result.success).toBe(true);
    });
  });

  describe('handleFailure - política de reintentos y DLQ', () => {
    const buildMessage = (
      retryCount: number,
      exchange = 'uct.activos.events',
      routingKey = 'notificacion.envio',
    ): amqp.Message =>
    ({
      fields: { exchange, routingKey },
      content: Buffer.from(JSON.stringify({ tipo: 'EMAIL' })),
      properties: {
        headers: { 'x-retry-count': retryCount },
        deliveryMode: 2,
      } as any,
    } as any);

    it('debe hacer nack sin requeue (hacia DLQ) cuando retryCount >= maxRetries (3)', async () => {
      const msg = buildMessage(3);
      const channelSpy = mockChannel.nack as jest.Mock;
      await (service as any).handleFailure(
        msg,
        3,
        'Error simulado',
        'notificaciones.queue',
        true,
      );
      expect(channelSpy).toHaveBeenCalledWith(msg, false, false);
    });

    it('debe republicar con ConfirmChannel y confirmar (ack) el mensaje original al recibir confirmación del broker', async () => {
      const msg = buildMessage(0);
      const ackSpy = mockChannel.ack as jest.Mock;
      jest.spyOn(service, 'republicarConConfirmacion').mockResolvedValueOnce(true);

      await (service as any).handleFailure(
        msg,
        0,
        'Fallo temporal',
        'notificaciones.queue',
        true,
      );

      expect(service.republicarConConfirmacion).toHaveBeenCalledWith(
        'uct.activos.events',
        'notificacion.envio',
        msg.content,
        msg.properties,
        1,
      );
      expect(ackSpy).toHaveBeenCalledWith(msg);
    });

    it('debe derivar a DLQ con nack(false, false) y NO hacer ACK si falla la confirmación de la republicación', async () => {
      const msg = buildMessage(0);
      const ackSpy = mockChannel.ack as jest.Mock;
      const nackSpy = mockChannel.nack as jest.Mock;
      jest.spyOn(service, 'republicarConConfirmacion').mockResolvedValueOnce(false);

      await (service as any).handleFailure(
        msg,
        0,
        'Fallo temporal',
        'notificaciones.queue',
        true,
      );

      expect(ackSpy).not.toHaveBeenCalled();
      expect(nackSpy).toHaveBeenCalledWith(msg, false, false);
    });

    it('debe derivar a DLQ inmediatamente ante un error no transitorio (isTransient=false)', async () => {
      const msg = buildMessage(0);
      const nackSpy = mockChannel.nack as jest.Mock;
      const republishSpy = jest.spyOn(service, 'republicarConConfirmacion');

      await (service as any).handleFailure(
        msg,
        0,
        'Error de formato DTO permanente',
        'notificaciones.queue',
        false,
      );

      expect(republishSpy).not.toHaveBeenCalled();
      expect(nackSpy).toHaveBeenCalledWith(msg, false, false);
    });
  });

  describe('stop', () => {
    it('debe cerrar canal y conexión', async () => {
      await service.start();
      await service.stop();
      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });
  });
});
