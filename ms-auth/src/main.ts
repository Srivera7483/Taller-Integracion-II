import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';


async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Registro del Interceptor / Filtro Global de Excepciones
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  const port = process.env.AUTH_PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  
  Logger.log(
    `Correcto: MS Autenticación corriendo en: http://localhost:${port}`,
    'Bootstrap',
  );
}
await bootstrap();
