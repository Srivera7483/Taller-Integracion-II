require('reflect-metadata');

const { ValidationPipe } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./app.module');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT || 3004);
  await app.listen(port, '0.0.0.0');
}

bootstrap().catch((error) => {
  console.error('No se pudo iniciar ms-notificaciones:', error);
  process.exitCode = 1;
});
