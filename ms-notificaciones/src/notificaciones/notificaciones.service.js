const { Inject, Injectable } = require('@nestjs/common');
const { MailerService } = require('@nestjs-modules/mailer');

class NotificacionesService {
  constructor(mailerService) {
    this.mailerService = mailerService;
  }

  async enviar(payload) {
    await this.mailerService.sendMail({
      to: payload.email,
      subject: payload.asunto,
      template: 'notificacion',
      context: {
        asunto: payload.asunto,
        cuerpoMensaje: payload.cuerpoMensaje,
      },
    });

    return { status: 'enviado' };
  }
}

Injectable()(NotificacionesService);
Inject(MailerService)(NotificacionesService, undefined, 0);
module.exports = { NotificacionesService };
