import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureHttp } from './configure-http';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureHttp(app);
  await app.listen(process.env.PORT ?? 3002);
}
void bootstrap();
