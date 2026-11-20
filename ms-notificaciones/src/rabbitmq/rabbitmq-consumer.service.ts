import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  Optional,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { RabbitmqTopologyService } from './rabbitmq-topology.service';
import { NotificacionEventoDto } from './dto/notificacion-evento.dto';
import { AuditoriaEventoDto } from './dto/auditoria-evento.dto';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

export interface ProcessMessageResult {
  success: boolean;
  error?: string;
}

export type MessageHandler = (
  content: Buffer,
  headers: Record<string, unknown>,
) => Promise<ProcessMessageResult>;

@Injectable()
export class RabbitmqConsumerService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqConsumerService.name);
  private readonly url: string;
  private readonly maxRetries: number;
  private connection?: any;
  private channel?: any;
  private readonly queues: string[];
  private notificationHandler?: (dto: NotificacionEventoDto) => Promise<unknown>;

  constructor(
    private readonly configService: ConfigService,
    private readonly topologyService: RabbitmqTopologyService,
    @Optional()
    @Inject(forwardRef(() => NotificacionesService))
    private readonly notificacionesService?: NotificacionesService,
  ) {
    this.url =
      this.configService.get<string>('RABBITMQ_URL') ??
      'amqp://guest:guest@localhost:5672';
    this.maxRetries = Number(
      this.configService.get<string>('RABBITMQ_MAX_RETRIES') ?? '3',
    );
    this.queues = [
      this.configService.get<string>('RABBITMQ_QUEUE_NOTIFICACIONES') ??
        'notificaciones.queue',
      this.configService.get<string>('RABBITMQ_QUEUE_AUDITORIA') ??
        'auditoria.queue',
    ];
  }

  registerNotificationHandler(
    handler: (dto: NotificacionEventoDto) => Promise<unknown>,
  ): void {
    this.notificationHandler = handler;
  }

  async onModuleInit() {
    // Garantiza que la topología (exchanges, colas, DLX, DLQ) esté declarada
    // ANTES de iniciar el consumo. Evita condiciones de carrera al arranque.
    await this.topologyService.declareTopology();
    await this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  async start() {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createChannel();

    await this.channel.prefetch(1);

    for (const queue of this.queues) {
      await this.channel.consume(queue, async (msg: amqp.Message) => {
        if (!msg) return;

        const retryCount = Number(
          (msg.properties.headers?.['x-retry-count'] as number) || 0,
        );

        try {
          const result = await this.process(
            msg.content,
            msg.properties.headers || {},
            queue,
          );
          if (result.success) {
            this.channel!.ack(msg);
          } else {
            await this.handleFailure(msg, retryCount, result.error, queue);
          }
        } catch (error) {
          await this.handleFailure(
            msg,
            retryCount,
            error instanceof Error ? error.message : String(error),
            queue,
          );
        }
      });
    }

    this.logger.log(
      `Consumidores RabbitMQ iniciados en: ${this.queues.join(', ')}`,
    );
  }

  async stop() {
    try {
      await this.channel?.close();
      await this.connection?.close();
    } catch (error) {
      this.logger.warn(
        `Error cerrando conexión RabbitMQ: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private async process(
    content: Buffer,
    headers: Record<string, unknown>,
    queue: string,
  ): Promise<ProcessMessageResult> {
    const raw = content.toString();
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Payload no es un JSON válido');
    }

    // Validación de contratos DTO con class-validator (criterio de aceptación #3)
    if (queue === 'notificaciones.queue') {
      const dto = plainToInstance(NotificacionEventoDto, parsed);
      const errors: ValidationError[] = await validate(dto);
      if (errors.length > 0) {
        const messages = errors.map((e) =>
          Object.values(e.constraints ?? {}).join(', '),
        );
        throw new Error(
          `NotificacionEventoDto inválido: ${messages.join('; ')}`,
        );
      }
      this.logger.log(
        `[RABBITMQ] Procesando notificación: ${JSON.stringify(dto)}`,
      );

      // Despacho real de correo y persistencia de trazabilidad
      if (this.notificacionesService) {
        const resultadoEnvio =
          await this.notificacionesService.procesarEventoNotificacion(dto);
        if (resultadoEnvio.status === 'fallida') {
          return {
            success: false,
            error: resultadoEnvio.error ?? 'Fallo al despachar notificación',
          };
        }
      } else if (this.notificationHandler) {
        await this.notificationHandler(dto);
      }
    } else if (queue === 'auditoria.queue') {
      const dto = plainToInstance(AuditoriaEventoDto, parsed);
      const errors: ValidationError[] = await validate(dto);
      if (errors.length > 0) {
        const messages = errors.map((e) =>
          Object.values(e.constraints ?? {}).join(', '),
        );
        throw new Error(`AuditoriaEventoDto inválido: ${messages.join('; ')}`);
      }
      this.logger.log(`[RABBITMQ] Procesando auditoría: ${JSON.stringify(dto)}`);
    } else {
      this.logger.log(`[RABBITMQ] Mensaje recibido en ${queue}: ${raw}`);
    }

    return { success: true };
  }

  private async handleFailure(
    msg: amqp.Message,
    retryCount: number,
    error?: string,
    queue = 'unknown',
  ) {
    this.logger.warn(
      `[RABBITMQ] Fallo procesando mensaje en ${queue}: ${error}. Reintentos: ${
        retryCount + 1
      }/${this.maxRetries}`,
    );

    if (retryCount + 1 >= this.maxRetries) {
      this.logger.error(
        `[RABBITMQ] Máximo de reintentos alcanzado. Enviando a DLQ (dead-letter.queue).`,
      );
      // nack con requeue=false → RabbitMQ enruta el mensaje vía DLX (x-dead-letter-exchange)
      // hacia la cola dead-letter.queue configurada en la topología.
      this.channel!.nack(msg, false, false);
      return;
    }

    const payload = msg.content.toString();
    const retryHeaders = {
      ...(msg.properties.headers || {}),
      'x-retry-count': retryCount + 1,
    };

    let publishOk = false;
    try {
      publishOk = this.channel!.publish(
        msg.fields.exchange,
        msg.fields.routingKey,
        Buffer.from(payload),
        {
          persistent: true,
          headers: retryHeaders,
        },
      );
    } catch (pubError) {
      this.logger.error(
        `[RABBITMQ] Excepción al republicar mensaje para reintento en ${queue}: ${
          pubError instanceof Error ? pubError.message : String(pubError)
        }. Reencolando mensaje original sin confirmar.`,
      );
      this.channel!.nack(msg, false, true);
      return;
    }

    if (!publishOk) {
      this.logger.error(
        `[RABBITMQ] La republicación no fue aceptada por el canal en ${queue} (buffer saturado). Reencolando mensaje original sin confirmar.`,
      );
      this.channel!.nack(msg, false, true);
      return;
    }

    // Confirmar mensaje original ÚNICAMENTE tras verificar que la republicación fue aceptada por el broker
    this.channel!.ack(msg);
  }
}
