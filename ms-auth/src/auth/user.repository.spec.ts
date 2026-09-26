import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UserRepository } from './user.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let prismaService: PrismaService;

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    } as unknown as PrismaService;

    userRepository = new UserRepository(prismaService);
  });

  describe('findById', () => {
    it('debe buscar usuario por id e incluir la relación role', async () => {
      const mockUser = { id: 'uuid-123', email: 'test@example.com', role: { name: 'TECNICO' } };
      vi.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await userRepository.findById('uuid-123');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        include: { role: true },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('debe buscar usuario por correo e incluir la relación role', async () => {
      const mockUser = { id: 'uuid-123', email: 'admin@test.com', role: { name: 'ADMINISTRADOR' } };
      vi.spyOn(prismaService.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await userRepository.findByEmail('admin@test.com');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@test.com' },
        include: { role: true },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateRole', () => {
    it('debe actualizar el rol usando la sintaxis connect de Prisma', async () => {
      const mockUpdatedUser = { id: 'uuid-123', role: { name: 'SUPERVISOR' } };
      vi.spyOn(prismaService.user, 'update').mockResolvedValue(mockUpdatedUser as any);

      const result = await userRepository.updateRole('uuid-123', 'SUPERVISOR');

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
        data: {
          role: {
            connect: { name: 'SUPERVISOR' },
          },
        },
        include: { role: true },
      });
      expect(result).toEqual(mockUpdatedUser);
    });
  });
});