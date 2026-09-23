import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard.js';

function createContext(authorization?: string): {
  context: ExecutionContext;
  request: { headers: { authorization?: string }; user?: unknown };
} {
  const request = { headers: { authorization }, user: undefined };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;

  return { context, request };
}

describe('JwtAuthGuard', () => {
  it('rejects requests without a bearer token', () => {
    const verify = vi.fn();
    const jwtService = { verify } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService);
    const { context } = createContext();

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejects invalid or expired tokens', () => {
    const verify = vi.fn().mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const jwtService = { verify } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService);
    const { context } = createContext('Bearer invalid-token');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('injects the validated user claims into the request', () => {
    const verify = vi
      .fn()
      .mockReturnValue({ userId: 'user-123', role: 'admin' });
    const jwtService = { verify } as unknown as JwtService;
    const guard = new JwtAuthGuard(jwtService);
    const { context, request } = createContext('bearer signed-token');

    expect(guard.canActivate(context)).toBe(true);
    expect(verify).toHaveBeenCalledWith('signed-token');
    expect(request.user).toEqual({ userId: 'user-123', role: 'admin' });
  });
});
