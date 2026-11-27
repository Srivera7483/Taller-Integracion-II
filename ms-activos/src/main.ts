import 'dotenv/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, resolveJwtSecret } from './app.module';

async function bootstrap() {
  if (!process.env.DATABASE_URL?.trim()) {
    Logger.error(
      '[Configuración Crítica] Falta definir DATABASE_URL en las variables de entorno de ms-activos.',
      'Bootstrap',
    );
    process.exit(1);
  }
  resolveJwtSecret();

  const app = await NestFactory.create(AppModule);

  const port = Number(process.env.PORT ?? 3003);

  // Configurar el prefijo global exigido por el contrato (RNF3)
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(port);
  Logger.log(`MS Activos ejecutándose en el puerto ${port}`, 'Bootstrap');
}
void bootstrap();