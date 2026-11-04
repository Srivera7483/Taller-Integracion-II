const { Controller, Inject, Post, Req } = require('@nestjs/common');
const { NotificacionesService } = require('./notificaciones.service');

class NotificacionesController {
  constructor(notificacionesService) {
    this.notificacionesService = notificacionesService || new NotificacionesService();
  }

  notificar(request) {
    const payload = request && request.body ? request.body : {};
    console.log('POST /notificar recibido:', payload);
    try {
      return this.notificacionesService.encolar(payload);
    } catch (error) {
      console.error('Error al procesar la notificación:', error);
      throw error;
    }
  }
}

Controller()(NotificacionesController);
Inject(NotificacionesService)(NotificacionesController, undefined, 0);
Post('notificar')(NotificacionesController.prototype, 'notificar', Object.getOwnPropertyDescriptor(NotificacionesController.prototype, 'notificar'));
Req()(NotificacionesController.prototype, 'notificar', 0);

module.exports = { NotificacionesController };
