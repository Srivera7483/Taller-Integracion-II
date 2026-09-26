import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RoleEnum } from './dto/update-role.dto.js';

describe('AuthController', () => {
  let authController: AuthController;
  let authServiceMock: AuthService;

  beforeEach(() => {
    authServiceMock = {
      login: vi.fn(),
      updateUserRole: vi.fn(),
    } as unknown as AuthService;

    authController = new AuthController(authServiceMock);
  });

  describe('login', () => {
    it('debe retornar el token emitido por AuthService', async () => {
      const dto = { email: 'admin@test.com', password: 'pass' };
      vi.spyOn(authServiceMock, 'login').mockResolvedValue({ accessToken: 'mock-token' });

      const result = await authController.login(dto);

      expect(authServiceMock.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ accessToken: 'mock-token' });
    });

    it('debe relanzar UnauthorizedException si falla el login', async () => {
      vi.spyOn(authServiceMock, 'login').mockRejectedValue(
        new UnauthorizedException('Credenciales inválidas'),
      );

      await expect(
        authController.login({ email: 'bad@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getAuthenticatedUser', () => {
    it('debe retornar los datos del usuario adjuntos en la request', () => {
      const mockReq = { user: { userId: '123', role: 'ADMINISTRADOR' } } as any;

      const result = authController.getAuthenticatedUser(mockReq);

      expect(result).toEqual({ userId: '123', role: 'ADMINISTRADOR' });
    });
  });

  describe('updateUserRole', () => {
    it('debe invocar a updateUserRole del servicio con los parámetros correctos', async () => {
      const dto = { rol: RoleEnum.TECNICO };
      const expectedResult = { id: 'uuid-123', role: { name: 'TECNICO' } };

      vi.spyOn(authServiceMock, 'updateUserRole').mockResolvedValue(expectedResult as any);

      const result = await authController.updateUserRole('uuid-123', dto);

      expect(authServiceMock.updateUserRole).toHaveBeenCalledWith('uuid-123', dto);
      expect(result).toEqual(expectedResult);
    });
  });
});