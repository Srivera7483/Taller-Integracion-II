/**
 * Pruebas de Integración - Microservicio ms-notificaciones
 *
 * NOTA DE ARQUITECTURA:
 * Estas pruebas de integración levantan el módulo real de NestJS (AppModule)
 * simulando las capas externas de transporte (amqplib y nodemailer) para verificar
 * el ciclo de vida completo, validación de contratos, enrutamiento, decisiones
 * de reintento transitorio vs. permanente, republicación mediante ConfirmChannel
 * y derivación a DLQ.
 *
 * Estas pruebas garantizan la corrección de la lógica de negocio y del consumidor
 * sin requerir un broker RabbitMQ en vivo en localhost:5672; sin embargo, no
 * sustituyen la verificación de la topología real declarada (exchanges, bindings,
 * x-dead-letter-exchange y x-dead-letter-routing-key) en el cluster de staging/producción.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from '../src/app.module';
import { NotificacionesController } from '../src/notificaciones/notificaciones.controller';
import { RabbitmqConsumerService } from '../src/rabbitmq/rabbitmq-consumer.service';
import { MailService } from '../src/mail/mail.service';
import { createMockChannel, createMockConnection } from './mocks/amqplib.mock';
import amqp from 'amqplib';

// Mock de nodemailer antes de instanciar cualquier módulo
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'integration-test-msg-id',
      response: '250 OK: message queued',
    }),
    verify: jest.fn().mockResolvedValue(true),
  }),
}));

describe('Notificaciones - Integración de Consumidor y Reintentos (NestJS AppModule)', () => {
  let app: INestApplication;
  let controller: NotificacionesController;
  let consumerService: RabbitmqConsumerService;
  let mailService: MailService;
  let mockChannel: ReturnType<typeof createMockChannel>;
  let mockConnection: ReturnType<typeof createMockConnection>;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.RABBITMQ_MAX_RETRIES = '3';
    process.env.MAIL_ALERTAS_CRITICAS = 'guardia.oficial@institucion.edu';

    mockChannel = createMockChannel();
    mockConnection = createMockConnection();
    (amqp.connect as jest.Mock).mockResolvedValue(mockConnection);
    mockConnection.createConfirmChannel.mockResolvedValue(mockChannel);
    mockConnection.createChannel.mockResolvedValue(mockChannel);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    controller = app.get<NotificacionesController>(NotificacionesController);
    consumerService = app.get<RabbitmqConsumerService>(RabbitmqConsumerService);
    mailService = app.get<MailService>(MailService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Escenario 1: Envío exitoso confirma (ack) el mensaje original', async () => {
    jest.spyOn(mailService, 'enviarNotificacionIncidenciaCritica').mockResolvedValueOnce({
      success: true,
      messageId: 'msg-crit-ok',
      isFallback: false,
    });

    const payload = {
      id_incidencia: 'inc-integ-1',
      titulo: 'Incendio en sala de servidores',
      email: 'operaciones@institucion.edu',
    };

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

    expect(mailService.enviarNotificacionIncidenciaCritica).toHaveBeenCalledWith(
      'operaciones@institucion.edu',
      expect.objectContaining({ idIncidencia: 'inc-integ-1' }),
    );
    expect(ackMock).toHaveBeenCalledWith(mockMsg);
    expect(nackMock).not.toHaveBeenCalled();
  });

  it('Escenario 2: Fallo SMTP transitorio con reintentos confirmados vía ConfirmChannel (0 -> 1, 1 -> 2, 2 -> 3)', async () => {
    jest.spyOn(mailService, 'enviarNotificacionIncidenciaCritica').mockResolvedValue({
      success: false,
      error: 'ETIMEDOUT: Connection to SMTP host timed out',
      isFallback: false,
    });

    const republishSpy = jest
      .spyOn(consumerService, 'republicarConConfirmacion')
      .mockResolvedValue(true);

    const payload = {
      id_incidencia: 'inc-integ-transient',
      titulo: 'Fallo transitorio SMTP',
      email: 'guardia@institucion.edu',
    };

    // Reintento 0 -> 1
    const ack0 = jest.fn();
    const nack0 = jest.fn();
    const msg0 = {
      content: Buffer.from(JSON.stringify(payload)),
      properties: { headers: { 'x-retry-count': 0 } },
      fields: { exchange: 'uct.activos.events', routingKey: 'incidencias_criticas' },
    };
    await controller.recibirIncidenciaCritica(payload, {
      getChannelRef: () => ({ ack: ack0, nack: nack0 }),
      getMessage: () => msg0,
    });
    expect(republishSpy).toHaveBeenLastCalledWith(
      'uct.activos.events',
      'incidencias_criticas',
      msg0.content,
      msg0.properties,
      1,
    );
    expect(ack0).toHaveBeenCalledWith(msg0);
    expect(nack0).not.toHaveBeenCalled();

    // Reintento 1 -> 2
    const ack1 = jest.fn();
    const nack1 = jest.fn();
    const msg1 = {
      content: Buffer.from(JSON.stringify(payload)),
      properties: { headers: { 'x-retry-count': 1 } },
      fields: { exchange: 'uct.activos.events', routingKey: 'incidencias_criticas' },
    };
    await controller.recibirIncidenciaCritica(payload, {
      getChannelRef: () => ({ ack: ack1, nack: nack1 }),
      getMessage: () => msg1,
    });
    expect(republishSpy).toHaveBeenLastCalledWith(
      'uct.activos.events',
      'incidencias_criticas',
      msg1.content,
      msg1.properties,
      2,
    );
    expect(ack1).toHaveBeenCalledWith(msg1);
    expect(nack1).not.toHaveBeenCalled();

    // Reintento 2 -> 3
    const ack2 = jest.fn();
    const nack2 = jest.fn();
    const msg2 = {
      content: Buffer.from(JSON.stringify(payload)),
      properties: { headers: { 'x-retry-count': 2 } },
      fields: { exchange: 'uct.activos.events', routingKey: 'incidencias_criticas' },
    };
    await controller.recibirIncidenciaCritica(payload, {
      getChannelRef: () => ({ ack: ack2, nack: nack2 }),
      getMessage: () => msg2,
    });
    expect(republishSpy).toHaveBeenLastCalledWith(
      'uct.activos.events',
      'incidencias_criticas',
      msg2.content,
      msg2.properties,
      3,
    );
    expect(ack2).toHaveBeenCalledWith(msg2);
    expect(nack2).not.toHaveBeenCalled();
  });

  it('Escenario 3: Derivación a DLQ con nack(false, false) al llegar a maxRetries (x-retry-count: 3)', async () => {
    jest.spyOn(mailService, 'enviarNotificacionIncidenciaCritica').mockResolvedValueOnce({
      success: false,
      error: 'ECONNREFUSED: SMTP Server unreachable',
      isFallback: false,
    });

    const republishSpy = jest.spyOn(consumerService, 'republicarConConfirmacion');

    const payload = {
      id_incidencia: 'inc-integ-max-retries',
      titulo: 'Incidencia con reintentos agotados',
      email: 'guardia@institucion.edu',
    };

    const ackMock = jest.fn();
    const nackMock = jest.fn();
    const mockMsg = {
      content: Buffer.from(JSON.stringify(payload)),
      properties: { headers: { 'x-retry-count': 3 } }, // retryCount >= maxRetries
      fields: { exchange: 'uct.activos.events', routingKey: 'incidencias_criticas' },
    };

    await controller.recibirIncidenciaCritica(payload, {
      getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
      getMessage: () => mockMsg,
    });

    expect(republishSpy).not.toHaveBeenCalled();
    expect(ackMock).not.toHaveBeenCalled();
    expect(nackMock).toHaveBeenCalledWith(mockMsg, false, false);
  });

  it('Escenario 4: Error permanente deriva directamente a DLQ sin republicar', async () => {
    const payload = {
      id_incidencia: 'inc-integ-sin-destinatario',
      titulo: 'Sin correo real en payload',
    };
    // Forzamos ausencia de correo institucional para provocar fallo permanente
    const configGetSpy = jest.spyOn(app.get(ConfigService), 'get').mockReturnValue(undefined);

    const republishSpy = jest.spyOn(consumerService, 'republicarConConfirmacion');
    const ackMock = jest.fn();
    const nackMock = jest.fn();
    const mockMsg = {
      content: Buffer.from(JSON.stringify(payload)),
      properties: { headers: { 'x-retry-count': 0 } },
      fields: { exchange: 'uct.activos.events', routingKey: 'incidencias_criticas' },
    };

    await controller.recibirIncidenciaCritica(payload, {
      getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
      getMessage: () => mockMsg,
    });

    expect(republishSpy).not.toHaveBeenCalled();
    expect(ackMock).not.toHaveBeenCalled();
    expect(nackMock).toHaveBeenCalledWith(mockMsg, false, false);

    configGetSpy.mockRestore();
  });

  it('Escenario 5: Fallo de confirmación en ConfirmChannel no hace ACK y deriva a DLQ', async () => {
    jest.spyOn(mailService, 'enviarNotificacionIncidenciaCritica').mockResolvedValueOnce({
      success: false,
      error: 'ESOCKETTIMEDOUT: Timeout connecting to host',
      isFallback: false,
    });

    // Simular que el broker rechaza la republicación (NACK)
    jest.spyOn(consumerService, 'republicarConConfirmacion').mockResolvedValueOnce(false);

    const payload = {
      id_incidencia: 'inc-integ-confirm-fail',
      titulo: 'Confirmación rechazada por broker',
      email: 'guardia@institucion.edu',
    };

    const ackMock = jest.fn();
    const nackMock = jest.fn();
    const mockMsg = {
      content: Buffer.from(JSON.stringify(payload)),
      properties: { headers: { 'x-retry-count': 0 } },
      fields: { exchange: 'uct.activos.events', routingKey: 'incidencias_criticas' },
    };

    await controller.recibirIncidenciaCritica(payload, {
      getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
      getMessage: () => mockMsg,
    });

    expect(ackMock).not.toHaveBeenCalled();
    expect(nackMock).toHaveBeenCalledWith(mockMsg, false, false);
  });

  it('Escenario 6: Evento no resolutivo es descartado limpiamente con ACK', async () => {
    const resolucionSpy = jest.spyOn(mailService, 'enviarNotificacionIncidenciaResuelta');
    const ordenSpy = jest.spyOn(mailService, 'enviarNotificacionOrdenAsignada');

    const payload = {
      id_incidencia: 'inc-integ-en-proceso',
      nuevo_estado: 'EN_PROCESO',
      emailReportante: 'profesor@institucion.edu',
    };

    const ackMock = jest.fn();
    const nackMock = jest.fn();
    const mockMsg = {
      content: Buffer.from(JSON.stringify(payload)),
      properties: { headers: { 'x-retry-count': 0 } },
      fields: { exchange: 'uct.activos.events', routingKey: 'incidencia_actualizada' },
    };

    await controller.recibirIncidenciaActualizada(payload, {
      getChannelRef: () => ({ ack: ackMock, nack: nackMock }),
      getMessage: () => mockMsg,
    });

    expect(resolucionSpy).not.toHaveBeenCalled();
    expect(ordenSpy).not.toHaveBeenCalled();
    expect(ackMock).toHaveBeenCalledWith(mockMsg);
    expect(nackMock).not.toHaveBeenCalled();
  });
});
