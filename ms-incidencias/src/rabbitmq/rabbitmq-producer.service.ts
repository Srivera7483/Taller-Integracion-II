import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import * as amqp from 'amqplib';
import { firstValueFrom, timeout } from 'rxjs';
import {
  IncidenciaCriticaEvento,
  IncidenciaActualizadaEvento,
  PrioridadDinamicaEscaladaEvento,
} from './interfaces/incidencia-evento.interface';

@Injectable()
export class RabbitmqProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqProducerService.name);
  private client!: ClientProxy;
  private amqpConnection?: any;
  private amqpChannel?: any;

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

  async emitirIncidenciaActualizada(
    payload: IncidenciaActualizadaEvento,
  ): Promise<boolean> {
    try {
      if (!this.client) {
        return false;
      }

      await firstValueFrom(
        this.client
          .emit('incidencia_actualizada', payload)
          .pipe(timeout(3000)),
      );

      this.logger.log(
        `[RABBITMQ] Publicación finalizada (incidencia_actualizada): ${payload.id_incidencia}`,
      );

      return true;
    } catch (error) {
      this.logger.warn(
        `[RABBITMQ] No se pudo publicar actualización de incidencia ${payload.id_incidencia}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return false;
    }
  }

  private async obtenerCanalTopicExchange(): Promise<{ channel: any; exchange: string }> {
    const exchange =
      this.configService.get<string>('RABBITMQ_EXCHANGE') || 'uct.activos.events';

    if (!this.amqpChannel) {
      const rmqUrl =
        this.configService.get<string>('RABBITMQ_URL') ||
        'amqp://guest:guest@localhost:5672';
      this.amqpConnection = await amqp.connect(rmqUrl);
      this.amqpChannel = await this.amqpConnection.createChannel();
      await this.amqpChannel.assertExchange(exchange, 'topic', { durable: true });
    }

    return { channel: this.amqpChannel, exchange };
  }

  private normalizarPrioridadNotificacion(
    prioridad: string,
  ): 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA' {
    const norm = String(prioridad || '')
      .trim()
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (norm === 'BAJA' || norm === 'MEDIA' || norm === 'ALTA' || norm === 'CRITICA') {
      return norm;
    }
    return 'MEDIA';
  }

  async emitirCambioPrioridadDinamica(
    payload: PrioridadDinamicaEscaladaEvento,
  ): Promise<boolean> {
    try {
      const { channel, exchange } = await this.obtenerCanalTopicExchange();
      const routingKey =
        this.configService.get<string>('RABBITMQ_ROUTING_KEY_PRIORIDAD') ||
        'notificacion.prioridad.escalada';

      const destinatarioEmail =
        payload.emailDestinatario ||
        this.configService.get<string>('DEFAULT_NOTIFICATION_EMAIL') ||
        'supervisor@uct.cl';

      const mensaje = {
        tipo: 'EMAIL',
        prioridad: this.normalizarPrioridadNotificacion(payload.prioridad_nueva),
        asunto: `[Prioridad Escalada: ${payload.prioridad_nueva}] Incidencia ${payload.titulo}`,
        cuerpo: `La incidencia "${payload.titulo}" (${payload.id_incidencia}) escaló su prioridad de ${payload.prioridad_anterior} a ${payload.prioridad_nueva} tras ${payload.tiempo_inactividad_horas}h de inactividad. ${payload.motivo_escalamiento}`,
        destinatario: {
          usuarioId: payload.id_tecnico || 'coordinadores',
          canal: 'EMAIL',
          direccion: destinatarioEmail,
        },
        idCorrelacion: `prioridad-dinamica:${payload.id_incidencia}:${this.normalizarPrioridadNotificacion(payload.prioridad_nueva)}`,
        metadata: {
          ...payload,
        },
      };

      const published = channel.publish(
        exchange,
        routingKey,
        Buffer.from(JSON.stringify(mensaje)),
        {
          persistent: true,
          contentType: 'application/json',
          messageId: mensaje.idCorrelacion,
        },
      );

      this.logger.log(
        `[RABBITMQ] Cambio de prioridad dinámica publicado en ${exchange} (${routingKey}): ${payload.id_incidencia} (${payload.prioridad_anterior} -> ${payload.prioridad_nueva})`,
      );

      return Boolean(published);
    } catch (error) {
      this.logger.warn(
        `[RABBITMQ] No se pudo publicar cambio de prioridad dinámica para ${payload.id_incidencia}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.amqpChannel = undefined;
      this.amqpConnection = undefined;
      return false;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.close();
    }
    try {
      if (this.amqpChannel) {
        await this.amqpChannel.close();
      }
      if (this.amqpConnection) {
        await this.amqpConnection.close();
      }
    } catch (error) {
      this.logger.warn(
        `[RABBITMQ] Error cerrando canal topic exchange: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}