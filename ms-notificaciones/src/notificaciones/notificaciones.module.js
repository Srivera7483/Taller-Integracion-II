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
        const port = Number(configService.getOrThrow('SMTP_PORT'));
        if (!Number.isInteger(port) || port <= 0) {
          throw new Error('SMTP_PORT must be a positive integer');
        }

        return {
          transport: {
            host: configService.getOrThrow('SMTP_HOST'),
            port,
            secure: port === 465,
            auth: {
              user: configService.getOrThrow('SMTP_USER'),
              pass: configService.getOrThrow('SMTP_PASS'),
            },
          },
          defaults: {
            from: configService.getOrThrow('MAIL_FROM'),
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
