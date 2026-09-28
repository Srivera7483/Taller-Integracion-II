import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user?: { userId: string; role: string }) => {
    const request = { user };
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return context;
  };

  it('permite el acceso si la ruta no define roles requeridos', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);
    const context = createMockContext({ userId: 'u1', role: 'TECNICO' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rechaza con 403 si request.user no existe o no tiene rol', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['ADMINISTRADOR']);
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rechaza con 403 si el rol del usuario no coincide con los roles requeridos', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['SUPERVISOR', 'ADMINISTRADOR']);
    const context = createMockContext({ userId: 'u1', role: 'TECNICO' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('permite el acceso si el rol del usuario coincide con los roles requeridos', () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(['SUPERVISOR', 'ADMINISTRADOR']);
    const context = createMockContext({ userId: 'u1', role: 'SUPERVISOR' });

    expect(guard.canActivate(context)).toBe(true);
  });
});
