import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    this.logger.log('Conectando a la base de datos...');
    await this.$connect();
    this.logger.log('Conexión a la base de datos establecida correctamente.');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Desconectando de la base de datos...');
    await this.$disconnect();
  }
}
