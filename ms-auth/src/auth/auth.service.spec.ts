import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { verify } from 'argon2';
import { AuthService } from './auth.service.js';
import { UserRepository } from './user.repository.js';
import { RoleEnum } from './dto/update-role.dto.js';

vi.mock('argon2', () => ({
  verify: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepositoryMock: any;
  let jwtMock: any;

  beforeEach(async () => {
    userRepositoryMock = {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      updateRole: vi.fn(),
    };

    jwtMock = {
      sign: vi.fn().mockReturnValue('signed-token'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: userRepositoryMock },
        { provide: JwtService, useValue: jwtMock },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('login', () => {
    it('debe retornar un JWT token cuando las credenciales son válidas', async () => {
      vi.mocked(verify).mockResolvedValue(true);
      userRepositoryMock.findByEmail.mockResolvedValue({
        id: 'user-123',
        password: '$argon2id$v=19$m=65536,t=3,p=4$test-hash',
        role: { name: 'ADMINISTRADOR' },
      });

      const result = await service.login({ email: 'ADMIN@test.com ', password: 'pass123' });

      expect(userRepositoryMock.findByEmail).toHaveBeenCalledWith('admin@test.com');
      expect(verify).toHaveBeenCalledWith(
        '$argon2id$v=19$m=65536,t=3,p=4$test-hash',
        'pass123',
      );
      expect(jwtMock.sign).toHaveBeenCalledWith({ userId: 'user-123', role: 'ADMINISTRADOR' });
      expect(result).toEqual({ accessToken: 'signed-token' });
    });

    it('debe lanzar UnauthorizedException si el correo no existe', async () => {
      userRepositoryMock.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'noexiste@test.com', password: 'pass123' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtMock.sign).not.toHaveBeenCalled();
    });

    it('debe lanzar UnauthorizedException si la contraseña no coincide', async () => {
      vi.mocked(verify).mockResolvedValue(false);
      userRepositoryMock.findByEmail.mockResolvedValue({
        id: 'user-123',
        password: 'hash',
        role: { name: 'TECNICO' },
      });

      await expect(
        service.login({ email: 'tecnico@test.com', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtMock.sign).not.toHaveBeenCalled();
    });
  });

  describe('updateUserRole', () => {
    it('debe actualizar el rol del usuario si este existe', async () => {
      const mockUser = { id: 'uuid-123', email: 'user@test.com' };
      const mockUpdated = { id: 'uuid-123', role: { name: RoleEnum.SUPERVISOR } };

      userRepositoryMock.findById.mockResolvedValue(mockUser);
      userRepositoryMock.updateRole.mockResolvedValue(mockUpdated);

      const result = await service.updateUserRole('uuid-123', { rol: RoleEnum.SUPERVISOR });

      expect(userRepositoryMock.findById).toHaveBeenCalledWith('uuid-123');
      expect(userRepositoryMock.updateRole).toHaveBeenCalledWith('uuid-123', RoleEnum.SUPERVISOR);
      expect(result).toEqual(mockUpdated);
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      userRepositoryMock.findById.mockResolvedValue(null);

      await expect(
        service.updateUserRole('uuid-inexistente', { rol: RoleEnum.SUPERVISOR }),
      ).rejects.toThrow(NotFoundException);

      expect(userRepositoryMock.updateRole).not.toHaveBeenCalled();
    });
  });
});