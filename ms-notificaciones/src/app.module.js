const { Module } = require('@nestjs/common');
const { ConfigModule } = require('@nestjs/config');
const { NotificacionesModule } = require('./notificaciones/notificaciones.module');

class AppModule {}

Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), NotificacionesModule],
})(AppModule);

module.exports = { AppModule };
