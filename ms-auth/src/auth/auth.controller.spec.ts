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
      refresh: vi.fn(),
      updateUserRole: vi.fn(),
      getAuthenticatedUser: vi.fn(),
    } as unknown as AuthService;

    authController = new AuthController(authServiceMock);
  });

  describe('login', () => {
    it('debe retornar el token emitido por AuthService', async () => {
      const dto = { email: 'admin@test.com', password: 'pass' };
      const response = { header: vi.fn() };
      vi.spyOn(authServiceMock, 'login').mockResolvedValue({
        token: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        usuario: { id_usuario: 'user-123' },
      } as any);

      const result = await authController.login(dto, response);

      expect(authServiceMock.login).toHaveBeenCalledWith(dto);
      expect(response.header).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.stringContaining(
          'refresh_token=mock-refresh-token; HttpOnly; SameSite=Strict',
        ),
      );
      expect(result).toEqual({
        token: 'mock-access-token',
        usuario: { id_usuario: 'user-123' },
      });
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('debe relanzar UnauthorizedException si falla el login', async () => {
      vi.spyOn(authServiceMock, 'login').mockRejectedValue(
        new UnauthorizedException('Credenciales inválidas'),
      );

      await expect(
        authController.login(
          { email: 'bad@test.com', password: 'wrong' },
          { header: vi.fn() },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('debe enviar el refresh token de la cookie al servicio', async () => {
      vi.spyOn(authServiceMock, 'refresh').mockResolvedValue({
        accessToken: 'new-access-token',
      });

      const result = await authController.refresh(
        'other=value; refresh_token=valid-refresh-token',
      );

      expect(authServiceMock.refresh).toHaveBeenCalledWith(
        'valid-refresh-token',
      );
      expect(result).toEqual({ accessToken: 'new-access-token' });
    });

    it('debe responder 401 si no se envía la cookie de refresh', async () => {
      await expect(authController.refresh(undefined)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authServiceMock.refresh).not.toHaveBeenCalled();
    });
  });

  describe('getAuthenticatedUser', () => {
    it('debe retornar los datos del usuario adjuntos en la request', async () => {
      const mockReq = { user: { userId: '123', role: 'ADMINISTRADOR' } } as any;
      vi.spyOn(authServiceMock, 'getAuthenticatedUser').mockResolvedValue({ userId: '123', role: 'ADMINISTRADOR' } as any);

      const result = await authController.getAuthenticatedUser(mockReq);

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
