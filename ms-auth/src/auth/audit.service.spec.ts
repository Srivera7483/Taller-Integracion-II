import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditEvent } from '@prisma/client';
import { AuditService } from './audit.service.js';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      $transaction: vi.fn().mockResolvedValue([[], 0]),
    };
    service = new AuditService(prisma);
  });

  it('normaliza el correo y registra un evento', async () => {
    await service.record(
      AuditEvent.LOGIN_FAILED,
      { email: ' Usuario@Example.com ' },
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        event: AuditEvent.LOGIN_FAILED,
        email: 'usuario@example.com',
      }),
    });
  });

  it('limita el tamano de la pagina y calcula los metadatos', async () => {
    prisma.$transaction.mockResolvedValue([[], 250]);

    const result = await service.list(2, 20);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 20 }),
    );
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(result.meta).toEqual({
      page: 2,
      limit: 20,
      total: 250,
      totalPages: 13,
    });
  });
});
