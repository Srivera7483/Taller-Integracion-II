import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';

export interface RabbitmqTopologyOptions {
  exchange: string;
  exchangeType: string;
  queues: {
    name: string;
    routingKeys: string[];
    durable?: boolean;
    deadLetterExchange?: string;
    deadLetterRoutingKey?: string;
  }[];
  dlq: {
    exchange: string;
    queue: string;
    routingKey: string;
    durable?: boolean;
    messageTtl?: number;
  };
}

@Injectable()
export class RabbitmqTopologyService {
  private readonly logger = new Logger(RabbitmqTopologyService.name);
  private readonly url: string;

  constructor(private readonly configService: ConfigService) {
    this.url =
      this.configService.get<string>('RABBITMQ_URL') ??
      'amqp://guest:guest@localhost:5672';
  }

  async declareTopology() {
    const connection = await amqp.connect(this.url);
    try {
      const channel = await connection.createChannel();

      const rawDlqRoutingKey = this.configService.get<string>('RABBITMQ_DLQ_ROUTING_KEY');
      const dlqRoutingKey =
        !rawDlqRoutingKey || rawDlqRoutingKey === 'incidencias_criticas'
          ? 'dead-letter'
          : rawDlqRoutingKey;

      const options: RabbitmqTopologyOptions = {
        exchange: this.configService.get<string>('RABBITMQ_EXCHANGE') ??
          'uct.activos.events',
        exchangeType: this.configService.get<string>('RABBITMQ_EXCHANGE_TYPE') ??
          'topic',
        queues: [
          {
            name: this.configService.get<string>('RABBITMQ_QUEUE_NOTIFICACIONES') ??
              'notificaciones.queue',
            routingKeys: ['notificacion.#'],
            durable: true,
            deadLetterExchange:
              this.configService.get<string>('RABBITMQ_DLX') ?? 'uct.dlx',
            deadLetterRoutingKey: dlqRoutingKey,
          },
          {
            name: this.configService.get<string>('RABBITMQ_QUEUE_AUDITORIA') ??
              'auditoria.queue',
            routingKeys: ['auditoria.#'],
            durable: true,
            deadLetterExchange:
              this.configService.get<string>('RABBITMQ_DLX') ?? 'uct.dlx',
            deadLetterRoutingKey: dlqRoutingKey,
          },
        ],
        dlq: {
          exchange:
            this.configService.get<string>('RABBITMQ_DLX') ?? 'uct.dlx',
          queue: this.configService.get<string>('RABBITMQ_DLQ') ??
            'dead-letter.queue',
          routingKey: dlqRoutingKey,
          durable: true,
          messageTtl: Number(
            this.configService.get<string>('RABBITMQ_MESSAGE_TTL') ?? '300000',
          ),
        },
      };

      // 1. Exchange principal de eventos (topic)
      await channel.assertExchange(options.exchange, options.exchangeType, {
        durable: true,
      });

      // 2. Dead Letter Exchange
      await channel.assertExchange(options.dlq.exchange, 'topic', {
        durable: true,
      });

      // 3. Colas de suscripción con DLX y routing key al DLQ
      for (const queue of options.queues) {
        const args: Record<string, unknown> = {
          'x-dead-letter-exchange': queue.deadLetterExchange,
          'x-dead-letter-routing-key': queue.deadLetterRoutingKey,
        };

        await channel.assertQueue(queue.name, {
          durable: queue.durable ?? true,
          arguments: args,
        });

        for (const routingKey of queue.routingKeys) {
          await channel.bindQueue(queue.name, options.exchange, routingKey);
        }
      }

      // 4. Cola de reintentos / DLQ con TTL de 5 minutos
      await channel.assertQueue(options.dlq.queue, {
        durable: options.dlq.durable ?? true,
        arguments: {
          'x-message-ttl': options.dlq.messageTtl,
        },
      });
      await channel.bindQueue(
        options.dlq.queue,
        options.dlq.exchange,
        options.dlq.routingKey,
      );

      await channel.close();
      this.logger.log('Topología RabbitMQ declarada correctamente');
    } finally {
      await connection.close();
    }
  }
}
