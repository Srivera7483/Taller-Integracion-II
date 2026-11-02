import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { IncidenciaCriticaEvento } from './interfaces/incidencia-evento.interface';

@Injectable()
export class RabbitmqProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqProducerService.name);
  private readonly client: ClientProxy;
  public readonly rmqUrl: string;
  public readonly queueName: string;

  constructor(@Optional() customClient?: ClientProxy) {
    this.rmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    this.queueName = process.env.RABBITMQ_QUEUE_CRITICAS || 'incidencias_criticas';

    this.client =
      customClient ??
      ClientProxyFactory.create({
        transport: Transport.RMQ,
        options: {
          urls: [this.rmqUrl],
          queue: this.queueName,
          queueOptions: {
            durable: true,
          },
        },
      });
  }

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log(`Conectado exitosamente al broker RabbitMQ (${this.rmqUrl}), cola: ${this.queueName}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Broker RabbitMQ no disponible durante inicio (${msg}). Los eventos críticos se enviarán en diferido/caliente.`,
      );
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.close();
    } catch {
      // Ignorar fallas al cerrar
    }
  }

  /**
   * Publica un evento de incidencia crítica en la cola de RabbitMQ.
   * Si el broker no está disponible, atrapa el error y no interrumpe el flujo principal.
   */
  async publicarIncidenciaCritica(evento: IncidenciaCriticaEvento): Promise<boolean> {
    const payload: IncidenciaCriticaEvento = {
      evento: 'INCIDENCIA_CRITICA_REGISTRADA',
      ...evento,
    };

    try {
      this.logger.log(
        `[PRODUCER] Publicando incidencia crítica ${payload.id_incidencia} ("${payload.titulo}") en cola "${this.queueName}"...`,
      );

      await firstValueFrom(
        this.client.emit('incidencia_critica', payload).pipe(timeout(3000)),
      );

      this.logger.log(
        `[PRODUCER] ✅ Evento de incidencia crítica ${payload.id_incidencia} enviado exitosamente a RabbitMQ.`,
      );
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[PRODUCER] ❌ Error al publicar incidencia crítica en RabbitMQ: ${msg}. La incidencia se registró en BD pero el evento no pudo encolarse.`,
      );
      return false;
    }
  }
}

