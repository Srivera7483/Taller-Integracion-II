import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard.js';

function createContext(user?: { userId: string; role: string }): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('permite acceso si la ruta no exige ningún rol', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createContext({ userId: '123', role: 'REPORTANTE' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('bloquea con 403 si el rol del usuario no coincide con el requerido', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPERVISOR']);
    const context = createContext({ userId: '123', role: 'REPORTANTE' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('permite acceso si el rol del usuario coincide con el autorizado', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['SUPERVISOR', 'ADMINISTRADOR']);
    const context = createContext({ userId: '123', role: 'SUPERVISOR' });

    expect(guard.canActivate(context)).toBe(true);
  });
});