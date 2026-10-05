import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureHttp } from './configure-http';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3002;

  configureHttp(app);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(port);
  console.log(`MS Incidencias corriendo en el puerto ${port}`);
}
void bootstrap();