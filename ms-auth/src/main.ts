import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Registro del Interceptor / Filtro Global de Excepciones
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  const port = process.env.AUTH_PORT ?? 3001;
  await app.listen(port);
  Logger.log(
    `🚀 MS Autenticación corriendo en: http://localhost:${port}`,
    'Bootstrap',
  );
}
await bootstrap();
