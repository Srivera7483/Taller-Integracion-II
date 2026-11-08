import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const requiredPermissions = ['incidencias:resolver'];
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let guard: PermissionsGuard;

  const contextFor = (permissions?: string[]): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { permissions: permissions ?? [] } }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredPermissions),
    };
    guard = new PermissionsGuard(reflector as unknown as Reflector);
  });

  it('permite ejecutar una accion cuando el permiso esta asignado', () => {
    expect(guard.canActivate(contextFor(['incidencias:resolver']))).toBe(true);
  });

  it('rechaza con 403 cuando falta el permiso requerido', () => {
    expect(() => guard.canActivate(contextFor(['incidencias:ver']))).toThrow(
      ForbiddenException,
    );
  });

  it('permite una ruta sin permisos declarados', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(contextFor([]))).toBe(true);
  });

  it.each([
    ['incidencias:crear', ['incidencias:crear']],
    ['incidencias:resolver', ['incidencias:resolver']],
    ['ordenes:asignar', ['ordenes:asignar']],
    ['ordenes:diagnosticar', ['ordenes:diagnosticar']],
    ['evidencias:subir', ['evidencias:subir']],
  ])('autoriza el permiso granular %s', (requiredPermission, grantedPermissions) => {
    reflector.getAllAndOverride.mockReturnValue([requiredPermission]);
    expect(guard.canActivate(contextFor(grantedPermissions))).toBe(true);
  });
});
