import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    } as unknown as JwtService;
    guard = new JwtAuthGuard(jwtService);
  });

  const createMockContext = (authorizationHeader?: string) => {
    const request: { headers: { authorization?: string }; user?: any } = {
      headers: { authorization: authorizationHeader },
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  it('rechaza con 401 si no hay encabezado Authorization', () => {
    const { context } = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rechaza con 401 si el formato del token no es Bearer', () => {
    const { context } = createMockContext('Basic 123456');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rechaza con 401 si la verificación de JwtService falla', () => {
    const { context } = createMockContext('Bearer token-invalido');
    (jwtService.verify as jest.Mock).mockImplementation(() => {
      throw new Error('jwt expired');
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('rechaza con 401 si los claims del JWT son inválidos o incompletos', () => {
    const { context } = createMockContext('Bearer token-sin-rol');
    (jwtService.verify as jest.Mock).mockReturnValue({
      userId: 'user-1',
      role: '',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('valida exitosamente e inyecta la identidad en request.user', () => {
    const { context, request } = createMockContext('Bearer token-valido');
    (jwtService.verify as jest.Mock).mockReturnValue({
      userId: 'tecnico-uuid-1',
      role: 'TECNICO',
      email: 'tecnico@uct.cl',
    });

    const canActivate = guard.canActivate(context);

    expect(canActivate).toBe(true);
    expect(request.user).toEqual({
      userId: 'tecnico-uuid-1',
      role: 'TECNICO',
      email: 'tecnico@uct.cl',
    });
  });
});
