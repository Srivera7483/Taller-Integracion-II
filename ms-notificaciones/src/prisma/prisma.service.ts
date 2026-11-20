import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.isConnected = true;
      this.logger.log(
        'Conexión con base de datos PostgreSQL (Prisma) establecida correctamente.',
      );
    } catch (error) {
      this.isConnected = false;
      this.logger.warn(
        `No se pudo conectar a la base de datos PostgreSQL: ${
          error instanceof Error ? error.message : String(error)
        }. El servicio continuará en modo degradado sin derribar la aplicación.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.isConnected) {
      try {
        await this.$disconnect();
      } catch (error) {
        this.logger.warn(
          `Error al desconectar Prisma: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }
}
