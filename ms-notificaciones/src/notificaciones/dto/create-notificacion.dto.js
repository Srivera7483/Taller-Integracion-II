const { IsEmail, IsNotEmpty, IsString, Matches } = require('class-validator');

class CreateNotificacionDto {}

IsEmail()(CreateNotificacionDto.prototype, 'email');
IsNotEmpty()(CreateNotificacionDto.prototype, 'email');
IsString()(CreateNotificacionDto.prototype, 'asunto');
IsNotEmpty()(CreateNotificacionDto.prototype, 'asunto');
Matches(/\S/, { message: 'asunto must contain a non-whitespace character' })(CreateNotificacionDto.prototype, 'asunto');
IsString()(CreateNotificacionDto.prototype, 'cuerpoMensaje');
IsNotEmpty()(CreateNotificacionDto.prototype, 'cuerpoMensaje');
Matches(/\S/, { message: 'cuerpoMensaje must contain a non-whitespace character' })(CreateNotificacionDto.prototype, 'cuerpoMensaje');

module.exports = { CreateNotificacionDto };
