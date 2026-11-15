import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { NotificacionEventoDto } from './dto/notificacion-evento.dto';
import { AuditoriaEventoDto } from './dto/auditoria-evento.dto';

@Injectable()
export class RabbitmqPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqPublisherService.name);
  private readonly url: string;
  private connection?: any;
  private channel?: any;

  constructor(private readonly configService: ConfigService) {
    this.url =
      this.configService.get<string>('RABBITMQ_URL') ??
      'amqp://guest:guest@localhost:5672';
  }

  async onModuleInit() {
    await this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  async start() {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();
  }

  async stop() {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (error) {
      this.logger.warn(
        `Error cerrando publisher RabbitMQ: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async publicarNotificacion(
    routingKey: string,
    payload: NotificacionEventoDto,
  ): Promise<boolean> {
    try {
      const exchange =
        this.configService.get<string>('RABBITMQ_EXCHANGE') ??
        'uct.activos.events';
      const buffer = Buffer.from(JSON.stringify(payload));

      if (this.channel) {
        this.channel.publish(exchange, routingKey, buffer, { persistent: true });
      }

      this.logger.log(`[RABBITMQ] Publicado en ${exchange}:${routingKey}`);
      return true;
    } catch (error) {
      this.logger.warn(
        `[RABBITMQ] No se pudo publicar notificación: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  async publicarAuditoria(
    routingKey: string,
    payload: AuditoriaEventoDto,
  ): Promise<boolean> {
    try {
      const exchange =
        this.configService.get<string>('RABBITMQ_EXCHANGE') ??
        'uct.activos.events';
      const buffer = Buffer.from(JSON.stringify(payload));

      if (this.channel) {
        this.channel.publish(exchange, routingKey, buffer, { persistent: true });
      }

      this.logger.log(`[RABBITMQ] Publicado en ${exchange}:${routingKey}`);
      return true;
    } catch (error) {
      this.logger.warn(
        `[RABBITMQ] No se pudo publicar auditoría: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
