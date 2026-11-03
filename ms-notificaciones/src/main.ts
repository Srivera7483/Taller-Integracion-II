import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { RmqOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('NotificacionesBootstrap');
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const rmqUrl = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
  const queueName = process.env.RABBITMQ_QUEUE_CRITICAS ?? 'incidencias_criticas';

  // Configurar Microservicio RabbitMQ esclavo para consumo de eventos (TAL-11)
  app.connectMicroservice<RmqOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: queueName,
      noAck: false, // Manual Acks para garantizar entrega confiable sin pérdida de paquetes (TAL-11)
      queueOptions: {
        durable: true,
      },
      prefetchCount: 1,
    },
  });

  try {
    await app.startAllMicroservices();
    logger.log(`Microservicio RabbitMQ conectado a ${rmqUrl}, escuchando cola "${queueName}"`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.warn(`Broker RabbitMQ no disponible al iniciar (${msg}). El servidor HTTP seguirá operativo.`);
  }

  const port = Number(process.env.PORT ?? 3004);
  await app.listen(port, '0.0.0.0');
  logger.log(`Servidor HTTP ms-notificaciones iniciado en el puerto ${port}`);
}

void bootstrap();
