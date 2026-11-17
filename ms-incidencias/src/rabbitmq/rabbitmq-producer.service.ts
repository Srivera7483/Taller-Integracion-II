import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { IncidenciaCriticaEvento } from './interfaces/incidencia-evento.interface';

@Injectable()
export class RabbitmqProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqProducerService.name);
  private client!: ClientProxy;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const rmqUrl = this.configService.get<string>('RABBITMQ_URL') || 'amqp://guest:guest@localhost:5672';
    const queueName = this.configService.get<string>('RABBITMQ_QUEUE_CRITICAS') || 'incidencias_criticas';
    const deadLetterExchange =
      this.configService.get<string>('RABBITMQ_DLQ_EXCHANGE') ||
      'incidencias_criticas.dlx';
    const deadLetterRoutingKey =
      this.configService.get<string>('RABBITMQ_DLQ_ROUTING_KEY') ||
      'incidencias_criticas';

    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [rmqUrl],
        queue: queueName,
        persistent: true,
        queueOptions: {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': deadLetterExchange,
            'x-dead-letter-routing-key': deadLetterRoutingKey,
          },
        },
      },
    });
  }

  async emitirIncidenciaCritica(
    payload: IncidenciaCriticaEvento,
  ): Promise<boolean> {
    try {
      await firstValueFrom(
        this.client
          .emit('incidencia_critica', payload)
          .pipe(timeout(3000)),
      );

      this.logger.log(
        `[RABBITMQ] Publicación finalizada: ${payload.id_incidencia}`,
      );

      return true;
    } catch (error) {
      this.logger.warn(
        `[RABBITMQ] No se pudo publicar la incidencia ${payload.id_incidencia}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
    }
  }
}