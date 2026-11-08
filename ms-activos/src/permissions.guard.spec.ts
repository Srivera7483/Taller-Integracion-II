import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard de activos', () => {
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'verify'>>;
  let guard: PermissionsGuard;

  const contextFor = (): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: 'Bearer token' } }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(['activos:gestionar']) };
    jwtService = { verify: jest.fn().mockReturnValue({ permissions: ['activos:gestionar'] }) };
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
      jwtService as unknown as JwtService,
    );
  });

  it('permite gestionar activos con el permiso asignado', () => {
    expect(guard.canActivate(contextFor())).toBe(true);
  });

  it('rechaza con 403 cuando el JWT no contiene el permiso', () => {
    jwtService.verify.mockReturnValue({ permissions: ['incidencias:ver'] });
    expect(() => guard.canActivate(contextFor())).toThrow(ForbiddenException);
  });

  it.each([
    ['activos:gestionar'],
    ['estadisticas:ver'],
    ['mantenimientos:crear'],
  ])('autoriza el permiso %s', (permission) => {
    reflector.getAllAndOverride.mockReturnValue([permission]);
    jwtService.verify.mockReturnValue({ permissions: [permission] });
    expect(guard.canActivate(contextFor())).toBe(true);
  });

  it('rechaza un token invalido con 401', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid token');
    });
    expect(() => guard.canActivate(contextFor())).toThrow(UnauthorizedException);
  });
});
