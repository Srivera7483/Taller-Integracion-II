import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureHttp } from './configure-http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureHttp(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3002);
}
void bootstrap();
