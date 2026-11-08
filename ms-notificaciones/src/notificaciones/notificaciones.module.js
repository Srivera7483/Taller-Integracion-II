const { Module } = require('@nestjs/common');
const { ConfigService } = require('@nestjs/config');
const { MailerModule } = require('@nestjs-modules/mailer');
const { HandlebarsAdapter } = require('@nestjs-modules/mailer/adapters/handlebars.adapter');
const { join } = require('node:path');
const { NotificacionesController } = require('./notificaciones.controller');
const { NotificacionesService } = require('./notificaciones.service');

class NotificacionesModule {}

Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService) => {
        const rawPort = configService.get('SMTP_PORT');
        const parsedPort = Number(rawPort);
        const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 587;
        const host = configService.get('SMTP_HOST') || 'localhost';
        const user = configService.get('SMTP_USER') || '';
        const pass = configService.get('SMTP_PASS') || '';
        const from = configService.get('MAIL_FROM') || 'no-reply@uct.cl';

        return {
          transport: {
            host,
            port,
            secure: port === 465,
            auth: user ? { user, pass } : undefined,
          },
          defaults: {
            from,
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: { strict: true },
          },
        };
      },
    }),
  ],
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
})(NotificacionesModule);

module.exports = { NotificacionesModule };
