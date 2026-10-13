const { IsEmail, IsNotEmpty, IsString, Matches } = require('class-validator');

class CreateNotificacionDto {}

const prototype = CreateNotificacionDto.prototype;

IsEmail()(prototype, 'email');
IsNotEmpty()(prototype, 'email');
IsString()(prototype, 'asunto');
IsNotEmpty()(prototype, 'asunto');
Matches(/\S/, {
  message: 'asunto must contain a non-whitespace character',
})(prototype, 'asunto');
IsString()(prototype, 'cuerpoMensaje');
IsNotEmpty()(prototype, 'cuerpoMensaje');
Matches(/\S/, {
  message: 'cuerpoMensaje must contain a non-whitespace character',
})(prototype, 'cuerpoMensaje');

module.exports = { CreateNotificacionDto };
