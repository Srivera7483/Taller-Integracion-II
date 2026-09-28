import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { OpenApiExceptionFilter } from './common/filters/openapi-exception.filter';

export function configureHttp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new OpenApiExceptionFilter(app.get(HttpAdapterHost)));
  app.enableShutdownHooks();
}
