import { ConfigService } from '@nestjs/config';
import { RabbitmqConsumerService } from './rabbitmq-consumer.service';
import { RabbitmqTopologyService } from './rabbitmq-topology.service';
import { createMockChannel, createMockConnection, mockConnect } from '../../test/mocks/amqplib.mock';
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
    mockConnection.createChannel.mockResolvedValue(mockChannel);
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
      configService.get.mockImplementation((key: string) => key === 'RABBITMQ_MAX_RETRIES' ? '5' : configValues[key]);
      const svc = new RabbitmqConsumerService(configService, topologyService);
      expect((svc as any).maxRetries).toBe(5);
    });

    it('debe configurar las colas notificaciones.queue y auditoria.queue', () => {
      const svc = new RabbitmqConsumerService(configService, topologyService);
      expect((svc as any).queues).toEqual(['notificaciones.queue', 'auditoria.queue']);
    });
  });

  describe('onModuleInit', () => {
    it('debe declarar topología antes de iniciar el consumo', async () => {
      await service.onModuleInit();
      expect(topologyService.declareTopology).toHaveBeenCalledTimes(1);
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
      expect(mockChannel.consume).toHaveBeenCalledTimes(2);
    });

    it('debe fallar si declareTopology lanza error', async () => {
      topologyService.declareTopology.mockRejectedValueOnce(new Error('Broker no disponible'));
      await expect(service.onModuleInit()).rejects.toThrow('Broker no disponible');
    });
  });

  describe('start', () => {
    it('debe conectar, crear canal, hacer prefetch y consumir ambas colas', async () => {
      await service.start();
      expect(amqp.connect).toHaveBeenCalledWith('amqp://guest:guest@localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();
      expect(mockChannel.prefetch).toHaveBeenCalledWith(1);
      expect(mockChannel.consume).toHaveBeenCalledWith('notificaciones.queue', expect.any(Function));
      expect(mockChannel.consume).toHaveBeenCalledWith('auditoria.queue', expect.any(Function));
    });
  });

  describe('process - validación de DTOs', () => {
    it('debe aceptar un NotificacionEventoDto válido en notificaciones.queue', async () => {
      const payload = JSON.stringify({
        tipo: 'EMAIL', prioridad: 'ALTA', asunto: 'Test', cuerpo: 'Cuerpo',
        destinatario: { usuarioId: 'u1', canal: 'email' },
      });
      const result = await (service as any).process(Buffer.from(payload), {}, 'notificaciones.queue');
      expect(result.success).toBe(true);
    });

    it('debe rechazar un NotificacionEventoDto inválido en notificaciones.queue', async () => {
      const payload = JSON.stringify({ tipo: 'EMAIL' });
      await expect((service as any).process(Buffer.from(payload), {}, 'notificaciones.queue')).rejects.toThrow('NotificacionEventoDto inválido');
    });

    it('debe aceptar un AuditoriaEventoDto válido en auditoria.queue', async () => {
      const payload = JSON.stringify({ accion: 'CREACION', entidad: 'Activo', idEntidad: 'a1', usuarioId: 'u1' });
      const result = await (service as any).process(Buffer.from(payload), {}, 'auditoria.queue');
      expect(result.success).toBe(true);
    });

    it('debe rechazar un AuditoriaEventoDto inválido en auditoria.queue', async () => {
      const payload = JSON.stringify({ accion: 'CREACION' });
      await expect((service as any).process(Buffer.from(payload), {}, 'auditoria.queue')).rejects.toThrow('AuditoriaEventoDto inválido');
    });

    it('debe lanzar error si el payload no es JSON válido', async () => {
      await expect((service as any).process(Buffer.from('no-es-json'), {}, 'notificaciones.queue')).rejects.toThrow('Payload no es un JSON válido');
    });

    it('debe aceptar cualquier cola desconocida sin validación de DTO', async () => {
      const result = await (service as any).process(Buffer.from('{}'), {}, 'otra.cola');
      expect(result.success).toBe(true);
    });
  });


  describe('handleFailure - lógica de reintentos y DLQ', () => {
    const buildMessage = (retryCount: number, exchange = 'uct.activos.events', routingKey = 'notificacion.envio'): amqp.Message => ({
      fields: { exchange, routingKey },
      content: Buffer.from(JSON.stringify({ tipo: 'EMAIL' })),
      properties: {
        headers: { 'x-retry-count': retryCount },
        deliveryMode: 2,
      } as any,
    } as any);

    it('debe hacer nack (sin requeue) cuando se agotan los reintentos (maxRetries=3)', async () => {
      const msg = buildMessage(2);
      const channelSpy = mockChannel.nack as jest.Mock;
      await (service as any).handleFailure(msg, 2, 'Error simulado', 'notificaciones.queue');
      expect(channelSpy).toHaveBeenCalledWith(msg, false, false);
    });

    it('debe republicar con x-retry-count incrementado cuando aún quedan reintentos', async () => {
      const msg = buildMessage(0);
      const publishSpy = mockChannel.publish as jest.Mock;
      const ackSpy = mockChannel.ack as jest.Mock;

      await (service as any).handleFailure(msg, 0, 'Error simulado', 'notificaciones.queue');

      expect(publishSpy).toHaveBeenCalledWith(
        'uct.activos.events',
        'notificacion.envio',
        Buffer.from(JSON.stringify({ tipo: 'EMAIL' })),
        expect.objectContaining({
          persistent: true,
          headers: expect.objectContaining({ 'x-retry-count': 1 }),
        }),
      );
      expect(ackSpy).toHaveBeenCalledWith(msg);
    });

    it('debe hacer nack tras el tercer intento fallido consecutivo', async () => {
      const msg = buildMessage(2);
      const nackSpy = mockChannel.nack as jest.Mock;
      const publishSpy = mockChannel.publish as jest.Mock;

      await (service as any).handleFailure(msg, 2, 'Error persistente', 'notificaciones.queue');

      expect(nackSpy).toHaveBeenCalledWith(msg, false, false);
      expect(publishSpy).not.toHaveBeenCalled();
    });

    it('debe usar maxRetries personalizado (5)', async () => {
      configService.get.mockImplementation((key: string) => key === 'RABBITMQ_MAX_RETRIES' ? '5' : configValues[key]);
      const svc = new RabbitmqConsumerService(configService, topologyService);
      (svc as any).channel = mockChannel;
      (svc as any).connection = mockConnection;
      const msg = buildMessage(4);
      const nackSpy = mockChannel.nack as jest.Mock;

      await (svc as any).handleFailure(msg, 4, 'Error', 'notificaciones.queue');
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
