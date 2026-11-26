import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let configService: jest.Mocked<ConfigService>;
  let mockTransporter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: '<test-message-id-12345>',
        accepted: ['test@example.com'],
      }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    configService = {
      get: jest.fn((key: string) => {
        const envs: Record<string, string> = {
          SMTP_HOST: 'smtp.gmail.com',
          SMTP_PORT: '587',
          SMTP_USER: 'test@institucion.edu',
          SMTP_PASS: 'secret',
          MAIL_FROM: 'InfraManager <notificaciones@institucion.edu>',
          NODE_ENV: 'test',
        };
        return envs[key];
      }),
    } as any;

    service = new MailService(configService);
    service.onModuleInit();
  });

  describe('inicialización del transporte', () => {
    it('debe inicializar transporte SMTP cuando están las credenciales', () => {
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: 'test@institucion.edu',
            pass: 'secret',
          },
        }),
      );
      expect(service.isFallback()).toBe(false);
      expect(service.isConfigured()).toBe(true);
    });

    it('debe activar fallback seguro en entorno de desarrollo/test cuando no hay credenciales SMTP', () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined as any;
      });
      service.inicializarTransporte();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          jsonTransport: true,
        }),
      );
      expect(service.isFallback()).toBe(true);
      expect(service.isConfigured()).toBe(true);
    });

    it('debe DESACTIVAR fallback en entorno de producción si faltan credenciales SMTP', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined as any;
      });
      service.inicializarTransporte();

      expect(service.isFallback()).toBe(false);
      expect(service.isConfigured()).toBe(false);

      const res = await service.enviarCorreo({
        to: 'dest@institucion.edu',
        subject: 'Alerta Producción',
        html: '<p>Test</p>',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('no se permite simulación en este entorno');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('enviarCorreo', () => {
    it('debe enviar correo exitosamente y retornar messageId', async () => {
      const result = await service.enviarCorreo({
        to: 'destinatario@institucion.edu',
        subject: 'Prueba de Envío',
        html: '<p>Hola Mundo</p>',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('<test-message-id-12345>');
    });

    it('debe capturar error de envío sin derribar la aplicación', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error('SMTP Connection Timeout'),
      );

      const result = await service.enviarCorreo({
        to: 'destinatario@institucion.edu',
        subject: 'Prueba de Fallo',
        html: '<p>Fallo</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP Connection Timeout');
    });
  });

  describe('plantillas de negocio', () => {
    it('debe enviar notificación de incidencia crítica con formato HTML', async () => {
      const result = await service.enviarNotificacionIncidenciaCritica(
        'guardia@institucion.edu',
        {
          idIncidencia: 'inc-uuid-1',
          titulo: 'Fuga de Gas en Laboratorio',
          descripcion: 'Falla detectada en válvula de seguridad.',
          ubicacion: 'Edificio B - Lab 3',
        },
      );

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'guardia@institucion.edu',
          subject: expect.stringContaining('[ALERTA CRÍTICA]'),
          html: expect.stringContaining('Fuga de Gas en Laboratorio'),
        }),
      );
    });

    it('debe enviar notificación de asignación de orden de trabajo', async () => {
      const result = await service.enviarNotificacionOrdenAsignada(
        'tecnico@institucion.edu',
        {
          idOrden: 'ord-uuid-1',
          idIncidencia: 'inc-uuid-1',
          titulo: 'Reparación de Proyector',
          tecnico: 'Juan Pérez',
          ubicacion: 'Aula 204',
          diagnostico: 'Reemplazo de lámpara requerido',
        },
      );

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'tecnico@institucion.edu',
          subject: expect.stringContaining('[ORDEN ASIGNADA]'),
          html: expect.stringContaining('Reparación de Proyector'),
        }),
      );
    });

    it('debe enviar notificación de resolución / cambio de estado', async () => {
      const result = await service.enviarNotificacionIncidenciaResuelta(
        'usuario@institucion.edu',
        {
          idIncidencia: 'inc-uuid-1',
          titulo: 'Falla de Conectividad Wi-Fi',
          nuevoEstado: 'RESUELTA',
          resolucion: 'Se reinició el Access Point principal.',
          tecnico: 'María López',
        },
      );

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'usuario@institucion.edu',
          subject: expect.stringContaining('[ACTUALIZACIÓN]'),
          html: expect.stringContaining('RESUELTA'),
        }),
      );
    });

    it('debe enviar notificación de alerta de mantenimiento preventivo', async () => {
      const result = await service.enviarNotificacionMantenimientoPreventivo(
        'mantenimiento@institucion.edu',
        {
          idActivo: 'act-uuid-1',
          nombreActivo: 'Generador Eléctrico Principal',
          fechaProgramada: '2026-12-01',
          ubicacion: 'Subestación Central',
        },
      );

      expect(result.success).toBe(true);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'mantenimiento@institucion.edu',
          subject: expect.stringContaining('[MANTENIMIENTO PREVENTIVO]'),
          html: expect.stringContaining('Generador Eléctrico Principal'),
        }),
      );
    });

    it('debe escapar caracteres HTML peligrosos en plantillas para prevenir inyección HTML', async () => {
      const result = await service.enviarNotificacionIncidenciaCritica(
        'guardia@institucion.edu',
        {
          idIncidencia: 'inc-xss-1',
          titulo: 'Alerta <script>alert("xss")</script>',
          descripcion: 'Detalle con <b>HTML</b> & "comillas"',
        },
      );

      expect(result.success).toBe(true);
      const sentArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentArgs.html).not.toContain('<script>');
      expect(sentArgs.html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(sentArgs.html).toContain('&lt;b&gt;HTML&lt;/b&gt; &amp; &quot;comillas&quot;');
    });
  });
});
