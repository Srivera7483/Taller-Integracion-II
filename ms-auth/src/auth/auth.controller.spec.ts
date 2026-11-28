import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { RoleEnum } from './dto/update-role.dto.js';
import { PERMISSIONS_KEY } from './permissions.decorator.js';
import { ROLES_KEY } from './roles.decorator.js';

describe('AuthController', () => {
  let authController: AuthController;
  let authServiceMock: AuthService;

  beforeEach(() => {
    authServiceMock = {
      login: vi.fn(),
      refresh: vi.fn(),
      updateUserRole: vi.fn(),
      deleteUser: vi.fn(),
      getAuthenticatedUser: vi.fn(),
    } as unknown as AuthService;

    authController = new AuthController(authServiceMock);
  });

  describe('login', () => {
    it('debe retornar el token emitido por AuthService y fijar la cookie HttpOnly', async () => {
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

    it('debe incluir refreshToken en el JSON cuando el cliente móvil envía X-Client-Type: mobile (TAL-199)', async () => {
      const dto = { email: 'tecnico@test.com', password: 'pass' };
      const response = { header: vi.fn() };
      vi.spyOn(authServiceMock, 'login').mockResolvedValue({
        token: 'mock-access-token',
        accessToken: 'mock-access-token',
        refreshToken: 'mock-mobile-refresh-token',
        usuario: { id_usuario: 'user-mobile-1' },
      } as any);

      const result = await authController.login(dto, response, 'mobile');

      expect(result.refreshToken).toBe('mock-mobile-refresh-token');
      expect(result.token).toBe('mock-access-token');
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
        {},
      );

      expect(authServiceMock.refresh).toHaveBeenCalledWith('valid-refresh-token');
      expect(result).toEqual({ accessToken: 'new-access-token' });
    });

    it('debe renovar el token si se proporciona refreshToken en el body (fallback)', async () => {
      vi.spyOn(authServiceMock, 'refresh').mockResolvedValue({
        accessToken: 'new-token-from-body',
      });

      const result = await authController.refresh(
        undefined,
        { refreshToken: 'valid-body-refresh' },
      );

      expect(authServiceMock.refresh).toHaveBeenCalledWith('valid-body-refresh');
      expect(result).toEqual({ accessToken: 'new-token-from-body' });
    });

    it('debe responder 401 si no se envía la cookie ni el body', async () => {
      await expect(authController.refresh(undefined, {})).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authServiceMock.refresh).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('debe expirar la cookie refresh_token y retornar confirmación de sesión cerrada', async () => {
      const response = {
        raw: { setHeader: vi.fn() },
        header: vi.fn(),
      };

      const result = await authController.logout(response);

      expect(response.raw.setHeader).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.arrayContaining([
          expect.stringContaining('refresh_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'),
        ]),
      );
      expect(result).toEqual({ message: 'Sesión cerrada exitosamente' });
    });

    it('debe limpiar la cookie mediante response.header cuando no existe response.raw', async () => {
      const response = { header: vi.fn() };

      const result = await authController.logout(response);

      expect(response.header).toHaveBeenCalledWith(
        'Set-Cookie',
        expect.stringContaining('refresh_token=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'),
      );
      expect(result).toEqual({ message: 'Sesión cerrada exitosamente' });
    });
  });

  describe('getAuthenticatedUser', () => {
    it('debe retornar los datos del usuario adjuntos en la request', async () => {
      const mockReq = { user: { userId: '123', role: 'ADMINISTRADOR' } } as any;
      vi.spyOn(authServiceMock, 'getAuthenticatedUser').mockResolvedValue({
        userId: '123',
        role: 'ADMINISTRADOR',
      } as any);

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

  describe('Seguridad PBAC (TAL-222)', () => {
    it('protege endpoints administrativos únicamente con @RequirePermissions y sin @Roles', () => {
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, AuthController.prototype.updateUserRole),
      ).toEqual(['usuarios:gestionar']);
      expect(
        Reflect.getMetadata(ROLES_KEY, AuthController.prototype.updateUserRole),
      ).toBeUndefined();

      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, AuthController.prototype.listUsers),
      ).toEqual(['usuarios:ver']);
      expect(
        Reflect.getMetadata(ROLES_KEY, AuthController.prototype.listUsers),
      ).toBeUndefined();

      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, AuthController.prototype.deleteUser),
      ).toEqual(['usuarios:gestionar']);
      expect(
        Reflect.getMetadata(ROLES_KEY, AuthController.prototype.deleteUser),
      ).toBeUndefined();
    });
  });
});