import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new FastifyAdapter());
  const port = process.env.AUTH_PORT ?? 3001;
  await app.listen(port);
  Logger.log(
    `🚀 MS Autenticación corriendo en: http://localhost:${port}`,
    'Bootstrap',
  );
}
await bootstrap();
