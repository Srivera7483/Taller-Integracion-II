import { Injectable, Logger } from '@nestjs/common';
import { AuditEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export interface AuditContext {
  email?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(
    event: AuditEvent,
    context: AuditContext = {},
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          event,
          email: context.email?.trim().toLowerCase() || null,
          userId: context.userId || null,
          ipAddress: context.ipAddress || null,
          userAgent: context.userAgent?.slice(0, 500) || null,
          metadata: metadata
            ? (metadata as Prisma.InputJsonValue)
            : undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `No fue posible registrar el evento de auditoria ${event}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async list(page: number, limit: number) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      data,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }
}
