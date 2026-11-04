const { Module } = require('@nestjs/common');
const { NotificacionesController } = require('./notificaciones.controller');
const { NotificacionesService } = require('./notificaciones.service');

class NotificacionesModule {}

Module({
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
})(NotificacionesModule);

module.exports = { NotificacionesModule };
