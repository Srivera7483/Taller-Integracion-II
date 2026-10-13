const { Body, Controller, Inject, Post } = require('@nestjs/common');
const { CreateNotificacionDto } = require('./dto/create-notificacion.dto');
const { NotificacionesService } = require('./notificaciones.service');

class NotificacionesController {
  constructor(notificacionesService) {
    this.notificacionesService = notificacionesService;
  }

  notificar(payload) {
    return this.notificacionesService.enviar(payload);
  }
}

const prototype = NotificacionesController.prototype;
const descriptor = Object.getOwnPropertyDescriptor(prototype, 'notificar');

Controller()(NotificacionesController);
Inject(NotificacionesService)(NotificacionesController, undefined, 0);
Post('notificar')(prototype, 'notificar', descriptor);
Body()(prototype, 'notificar', 0);
Reflect.defineMetadata(
  'design:paramtypes',
  [CreateNotificacionDto],
  prototype,
  'notificar',
);

module.exports = { NotificacionesController };
