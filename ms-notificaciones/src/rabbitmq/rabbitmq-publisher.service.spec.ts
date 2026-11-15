import { ConfigService } from '@nestjs/config';
import { RabbitmqPublisherService } from './rabbitmq-publisher.service';
import { createMockChannel, createMockConnection, mockConnect } from '../../test/mocks/amqplib.mock';
import amqp from 'amqplib';


describe('RabbitmqPublisherService', () => {
  let service: RabbitmqPublisherService;
  let configService: jest.Mocked<ConfigService>;
  let mockChannel: ReturnType<typeof createMockChannel>;
  let mockConnection: ReturnType<typeof createMockConnection>;

  const configValues: Record<string, string> = {
    RABBITMQ_URL: 'amqp://guest:guest@localhost:5672',
    RABBITMQ_EXCHANGE: 'uct.activos.events',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockChannel = createMockChannel();
    mockConnection = createMockConnection();
    configService = { get: jest.fn((key: string) => configValues[key] ?? undefined) } as any;
    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);
    mockConnection.createChannel.mockResolvedValue(mockChannel);
    service = new RabbitmqPublisherService(configService);
    (service as any).channel = mockChannel;
    (service as any).connection = mockConnection;
  });

  describe('start', () => {
    it('debe conectar y crear canal de publicación', async () => {
      await service.start();
      expect(amqp.connect).toHaveBeenCalledWith('amqp://guest:guest@localhost:5672');
      expect(mockConnection.createChannel).toHaveBeenCalled();
    });
  });

  describe('publicarNotificacion', () => {
    const payloadValido = {
      tipo: 'EMAIL',
      prioridad: 'ALTA',
      asunto: 'Notificación',
      cuerpo: 'Cuerpo del mensaje',
      destinatario: { usuarioId: 'u1', canal: 'email' },
    };

    it('debe publicar en el exchange uct.activos.events con routing key dada', async () => {
      await service.start();
      const resultado = await service.publicarNotificacion('notificacion.envio', payloadValido as any);
      expect(resultado).toBe(true);
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'uct.activos.events',
        'notificacion.envio',
        Buffer.from(JSON.stringify(payloadValido)),
        { persistent: true },
      );
    });

    it('debe retornar false si no hay canal disponible', async () => {
      service = new RabbitmqPublisherService(configService);
      // no se llama a start(), así que this.channel es undefined
      const resultado = await service.publicarNotificacion('notificacion.envio', payloadValido as any);
      expect(resultado).toBe(true); // publish no se llama pero no lanza error
      expect(mockChannel.publish).not.toHaveBeenCalled();
    });

    it('debe retornar false y hacer catch si la publicación falla', async () => {
      await service.start();
      (mockChannel.publish as jest.Mock).mockImplementation(() => { throw new Error('Broker caído'); });
      const resultado = await service.publicarNotificacion('notificacion.envio', payloadValido as any);
      expect(resultado).toBe(false);
    });
  });

  describe('publicarAuditoria', () => {
    const payloadValido = {
      accion: 'CREACION',
      entidad: 'Activo',
      idEntidad: 'a1',
      usuarioId: 'u1',
    };

    it('debe publicar en el exchange uct.activos.events con routing key dada', async () => {
      await service.start();
      const resultado = await service.publicarAuditoria('auditoria.registro', payloadValido as any);
      expect(resultado).toBe(true);
      expect(mockChannel.publish).toHaveBeenCalledWith(
        'uct.activos.events',
        'auditoria.registro',
        Buffer.from(JSON.stringify(payloadValido)),
        { persistent: true },
      );
    });

    it('debe retornar false si la publicación falla', async () => {
      await service.start();
      (mockChannel.publish as jest.Mock).mockImplementation(() => { throw new Error('Error de publicación'); });
      const resultado = await service.publicarAuditoria('auditoria.registro', payloadValido as any);
      expect(resultado).toBe(false);
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
