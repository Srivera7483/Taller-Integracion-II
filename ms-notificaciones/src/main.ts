
import 'reflect-metadata';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Transport, RmqOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.connectMicroservice<RmqOptions>(
    {
      transport: Transport.RMQ,
      options: {
        urls: [
          process.env.RABBITMQ_URL ??
            'amqp://guest:guest@localhost:5672',
        ],
        queue:
          process.env.RABBITMQ_QUEUE_CRITICAS ??
          'incidencias_criticas',
        queueOptions: {
          durable: true,
        },
        noAck: false,
        prefetchCount: 1,
      },
    },
    { inheritAppConfig: true },
  );

  const port = Number(process.env.PORT ?? 3004);

  await app.startAllMicroservices();
  await app.listen(port, '0.0.0.0');

  Logger.log(
    `MS Notificaciones iniciado en puerto ${port}`,
    'Bootstrap',
  );
}

bootstrap().catch((error: unknown) => {
  console.error('No se pudo iniciar ms-notificaciones:', error);
  process.exitCode = 1;
});
