const { Injectable } = require('@nestjs/common');

class NotificacionesService {
  encolar(payload) {
    console.log('Notificacion encolada:', payload);
    return { status: 'encolada' };
  }
}

Injectable()(NotificacionesService);

module.exports = { NotificacionesService };
