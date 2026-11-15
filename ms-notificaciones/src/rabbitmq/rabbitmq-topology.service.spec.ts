import { ConfigService } from '@nestjs/config';
import { RabbitmqTopologyService } from './rabbitmq-topology.service';
import { createMockChannel, createMockConnection, mockConnect } from '../../test/mocks/amqplib.mock';
import amqp from 'amqplib';


describe('RabbitmqTopologyService', () => {
  let service: RabbitmqTopologyService;
  let configService: jest.Mocked<ConfigService>;
  let mockChannel: ReturnType<typeof createMockChannel>;
  let mockConnection: ReturnType<typeof createMockConnection>;

  const configValues: Record<string, string> = {
    RABBITMQ_URL: 'amqp://guest:guest@localhost:5672',
    RABBITMQ_EXCHANGE: 'uct.activos.events',
    RABBITMQ_EXCHANGE_TYPE: 'topic',
    RABBITMQ_QUEUE_NOTIFICACIONES: 'notificaciones.queue',
    RABBITMQ_QUEUE_AUDITORIA: 'auditoria.queue',
    RABBITMQ_DLX: 'uct.dlx',
    RABBITMQ_DLQ: 'dead-letter.queue',
    RABBITMQ_DLQ_ROUTING_KEY: 'dead-letter',
    RABBITMQ_MESSAGE_TTL: '300000',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockChannel = createMockChannel();
    mockConnection = createMockConnection();
    configService = { get: jest.fn((key: string) => configValues[key] ?? undefined) } as any;
    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);
    mockConnection.createChannel.mockResolvedValue(mockChannel);
    service = new RabbitmqTopologyService(configService);
  });

  describe('declareTopology', () => {
    it('debe declarar exchange principal de tipo topic', async () => {
      await service.declareTopology();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('uct.activos.events', 'topic', { durable: true });
    });

    it('debe declarar DLX de tipo topic', async () => {
      await service.declareTopology();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('uct.dlx', 'topic', { durable: true });
    });

    it('debe declarar notificaciones.queue con argumentos DLX y DLQ routing key', async () => {
      await service.declareTopology();
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('notificaciones.queue', {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'uct.dlx',
          'x-dead-letter-routing-key': 'dead-letter',
        },
      });
    });

    it('debe declarar auditoria.queue con argumentos DLX y DLQ routing key', async () => {
      await service.declareTopology();
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('auditoria.queue', {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'uct.dlx',
          'x-dead-letter-routing-key': 'dead-letter',
        },
      });
    });

    it('debe bindear notificaciones.queue con routing key notificacion.#', async () => {
      await service.declareTopology();
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(
        'notificaciones.queue',
        'uct.activos.events',
        'notificacion.#',
      );
    });

    it('debe bindear auditoria.queue con routing key auditoria.#', async () => {
      await service.declareTopology();
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(
        'auditoria.queue',
        'uct.activos.events',
        'auditoria.#',
      );
    });

    it('debe declarar dead-letter.queue con x-message-ttl de 300000 ms (5 minutos)', async () => {
      await service.declareTopology();
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('dead-letter.queue', {
        durable: true,
        arguments: {
          'x-message-ttl': 300000,
        },
      });
    });

    it('debe bindear dead-letter.queue al DLX con routing key dead-letter', async () => {
      await service.declareTopology();
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(
        'dead-letter.queue',
        'uct.dlx',
        'dead-letter',
      );
    });

    it('debe cerrar canal y conexión al finalizar', async () => {
      await service.declareTopology();
      expect(mockChannel.close).toHaveBeenCalled();
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('debe usar valores por defecto cuando no hay variables de entorno', async () => {
      configService.get.mockReturnValue(undefined);
      await service.declareTopology();
      expect(mockChannel.assertExchange).toHaveBeenCalledWith('uct.activos.events', 'topic', { durable: true });
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('notificaciones.queue', expect.objectContaining({
        arguments: expect.objectContaining({
          'x-dead-letter-exchange': 'uct.dlx',
          'x-dead-letter-routing-key': 'dead-letter',
        }),
      }));
      expect(mockChannel.assertQueue).toHaveBeenCalledWith('dead-letter.queue', expect.objectContaining({
        arguments: expect.objectContaining({ 'x-message-ttl': 300000 }),
      }));
    });
  });
});
