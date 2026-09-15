import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.AUTH_PORT ?? 3001;
  await app.listen(port);
  Logger.log(
    `🚀 MS Autenticación corriendo en: http://localhost:${port}`,
    'Bootstrap',
  );
}
await bootstrap();
