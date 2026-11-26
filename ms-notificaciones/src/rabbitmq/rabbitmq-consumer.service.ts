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
  transient?: boolean;
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

  getChannel(): any {
    return this.channel;
  }

  async start() {
    this.connection = await amqp.connect(this.url);
    this.channel = await this.connection.createConfirmChannel();

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
            await this.handleFailure(
              msg,
              retryCount,
              result.error,
              queue,
              result.transient ?? false,
            );
          }
        } catch (error) {
          await this.handleFailure(
            msg,
            retryCount,
            error instanceof Error ? error.message : String(error),
            queue,
            false,
          );
        }
      });
    }

    this.logger.log(
      `Consumidores RabbitMQ iniciados con ConfirmChannel en: ${this.queues.join(
        ', ',
      )}`,
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

      // Despacho real de correo y logs estructurados de trazabilidad
      if (this.notificacionesService) {
        const resultadoEnvio =
          await this.notificacionesService.procesarEventoNotificacion(dto);
        if (resultadoEnvio.status === 'fallida') {
          return {
            success: false,
            error: resultadoEnvio.error ?? 'Fallo al despachar notificación',
            transient: resultadoEnvio.transient ?? false,
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

  /**
   * Republica un mensaje utilizando ConfirmChannel esperando confirmación explícita
   * (ACK/NACK) del broker antes de permitir el ACK del mensaje original.
   */
  async republicarConConfirmacion(
    exchange: string,
    routingKey: string,
    content: Buffer,
    properties: amqp.MessageProperties = {} as amqp.MessageProperties,
    nuevoRetryCount = 1,
  ): Promise<boolean> {
    if (!this.channel) {
      this.logger.error(
        '[RABBITMQ] No hay canal de confirmación disponible para republicar',
      );
      return false;
    }

    const headers = {
      ...(properties.headers || {}),
      'x-retry-count': nuevoRetryCount,
    };

    const publishOptions: amqp.Options.Publish = {
      ...properties,
      headers,
      persistent: (properties as any).persistent ?? (properties.deliveryMode === 2 || true),
    };

    return new Promise<boolean>((resolve) => {
      try {
        const accepted = this.channel.publish(
          exchange,
          routingKey,
          content,
          publishOptions,
          (err: any) => {
            if (err) {
              this.logger.error(
                `[RABBITMQ] Broker rechazó republicación (NACK) en exchange '${exchange}', routingKey '${routingKey}': ${
                  err instanceof Error ? err.message : String(err)
                }`,
              );
              resolve(false);
            } else {
              this.logger.log(
                `[RABBITMQ] Republicación confirmada por broker en '${exchange}' / '${routingKey}' con x-retry-count: ${nuevoRetryCount}`,
              );
              resolve(true);
            }
          },
        );

        if (accepted === false) {
          this.logger.warn(
            `[RABBITMQ] Buffer saturado al republicar en exchange '${exchange}', routingKey '${routingKey}'`,
          );
        }
      } catch (publishErr) {
        this.logger.error(
          `[RABBITMQ] Excepción al invocar publish en ConfirmChannel: ${
            publishErr instanceof Error ? publishErr.message : String(publishErr)
          }`,
        );
        resolve(false);
      }
    });
  }

  private async handleFailure(
    msg: amqp.Message,
    retryCount: number,
    error?: string,
    queue = 'unknown',
    isTransient = true,
  ) {
    this.logger.warn(
      `[RABBITMQ] Fallo procesando mensaje en ${queue}: ${error}. Reintentos: ${retryCount}/${this.maxRetries}`,
    );

    // Ante error permanente (transient === false) o cuando retryCount >= maxRetries:
    // Derivar directamente a la DLQ sin requeue
    if (!isTransient || retryCount >= this.maxRetries) {
      this.logger.error(
        `[RABBITMQ] ${
          !isTransient
            ? 'Error permanente detectado (no transitorio)'
            : 'Máximo de reintentos alcanzado'
        }. Enviando a DLQ (dead-letter.queue).`,
      );
      // nack con requeue=false → RabbitMQ enruta el mensaje vía DLX (x-dead-letter-exchange)
      // hacia la cola dead-letter.queue configurada en la topología.
      this.channel!.nack(msg, false, false);
      return;
    }

    const exchange = msg.fields.exchange || '';
    const routingKey = msg.fields.routingKey || queue;
    const nuevoRetryCount = retryCount + 1;

    const confirmada = await this.republicarConConfirmacion(
      exchange,
      routingKey,
      msg.content,
      msg.properties,
      nuevoRetryCount,
    );

    if (confirmada) {
      // Confirmar mensaje original ÚNICAMENTE tras verificar que la republicación fue aceptada por el broker
      this.channel!.ack(msg);
    } else {
      this.logger.error(
        `[RABBITMQ] No se pudo confirmar la republicación en ${queue}. Derivando mensaje a DLQ sin ack para evitar bucle infinito.`,
      );
      this.channel!.nack(msg, false, false);
    }
  }
}
