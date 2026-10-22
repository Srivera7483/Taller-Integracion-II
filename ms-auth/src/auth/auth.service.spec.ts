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
      verify: vi.fn(),
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
        email: 'admin@test.com',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$test-hash',
        fechaCreacion: new Date(),
        fechaEliminacion: null,
        rut_o_id: '123',
        nombre: 'Admin',
        apellido: 'Test',
        role: { id: 1, nombreRol: 'ADMINISTRADOR', name: 'ADMINISTRADOR' },
      });

      const result = await service.login({ email: 'ADMIN@test.com ', password: 'pass123' });

      expect(userRepositoryMock.findByEmail).toHaveBeenCalledWith('admin@test.com');
      expect(verify).toHaveBeenCalledWith(
        '$argon2id$v=19$m=65536,t=3,p=4$test-hash',
        'pass123',
      );
      expect(jwtMock.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          role: 'ADMINISTRADOR',
          email: 'admin@test.com',
          tokenUse: 'access',
        }),
      );
      expect(jwtMock.sign).toHaveBeenCalledWith(
        { sub: 'user-123', tokenUse: 'refresh' },
        { secret: expect.any(String), expiresIn: '7d' },
      );
      expect(result).toEqual(expect.objectContaining({ token: 'signed-token' }));
      expect(result.refreshToken).toBe('signed-token');
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

    it('debe rechazar usuarios eliminados', async () => {
      userRepositoryMock.findByEmail.mockResolvedValue({
        id: 'user-123',
        fechaEliminacion: new Date(),
      });

      await expect(
        service.login({ email: 'deleted@test.com', password: 'pass123' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtMock.sign).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('debe emitir un access token al validar un refresh token de un usuario activo', async () => {
      jwtMock.verify.mockReturnValue({
        sub: 'user-123',
        tokenUse: 'refresh',
      });
      userRepositoryMock.findById.mockResolvedValue({
        id: 'user-123',
        email: 'admin@test.com',
        fechaEliminacion: null,
        role: { nombreRol: 'ADMINISTRADOR' },
      });

      const result = await service.refresh('valid-refresh-token');

      expect(jwtMock.verify).toHaveBeenCalledWith(
        'valid-refresh-token',
        { secret: expect.any(String) },
      );
      expect(userRepositoryMock.findById).toHaveBeenCalledWith('user-123');
      expect(jwtMock.sign).toHaveBeenCalledWith(
        expect.objectContaining({ sub: 'user-123', tokenUse: 'access' }),
      );
      expect(result).toEqual({ accessToken: 'signed-token' });
    });

    it.each(['JsonWebTokenError', 'TokenExpiredError'])(
      'debe rechazar un refresh token inválido o expirado (%s)',
      async (name) => {
        jwtMock.verify.mockImplementation(() => {
          const error = new Error('invalid token');
          error.name = name;
          throw error;
        });

        await expect(service.refresh('invalid-refresh-token')).rejects.toThrow(
          UnauthorizedException,
        );
        expect(userRepositoryMock.findById).not.toHaveBeenCalled();
      },
    );

    it('debe rechazar un usuario eliminado o inexistente', async () => {
      jwtMock.verify.mockReturnValue({
        sub: 'deleted-user',
        tokenUse: 'refresh',
      });
      userRepositoryMock.findById.mockResolvedValue({
        id: 'deleted-user',
        fechaEliminacion: new Date(),
      });

      await expect(service.refresh('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtMock.sign).not.toHaveBeenCalled();
    });

    it('debe rechazar un JWT que no esté marcado como refresh token', async () => {
      jwtMock.verify.mockReturnValue({
        sub: 'user-123',
        tokenUse: 'access',
      });

      await expect(service.refresh('access-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(userRepositoryMock.findById).not.toHaveBeenCalled();
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