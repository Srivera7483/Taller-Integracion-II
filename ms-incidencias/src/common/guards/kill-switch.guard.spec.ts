import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { KillSwitchGuard } from './kill-switch.guard';

describe('KillSwitchGuard (TAL-4)', () => {
  let guard: KillSwitchGuard;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    guard = new KillSwitchGuard();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createMockContext = (method: string) => {
    const setHeaderMock = jest.fn();
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method }),
        getResponse: () => ({ setHeader: setHeaderMock }),
      }),
      setHeaderMock,
    } as unknown as ExecutionContext & { setHeaderMock: jest.Mock };
  };

  it('permite cualquier petición cuando el Kill Switch está inactivo', () => {
    delete process.env.KILL_SWITCH_INCIDENCIAS_ENABLED;
    delete process.env.KILL_SWITCH_ENABLED;

    const context = createMockContext('POST');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite peticiones de lectura (GET) incluso cuando el Kill Switch está activo', () => {
    process.env.KILL_SWITCH_INCIDENCIAS_ENABLED = 'true';

    const context = createMockContext('GET');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('bloquea peticiones mutantes (POST, PUT, PATCH, DELETE) con HTTP 503 y cabecera X-Kill-Switch', () => {
    process.env.KILL_SWITCH_INCIDENCIAS_ENABLED = 'true';
    process.env.KILL_SWITCH_MOTIVO = 'Mantenimiento crítico de base de datos.';

    const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    for (const method of methods) {
      const context = createMockContext(method);

      try {
        guard.canActivate(context);
        fail(`Debería haber lanzado excepción para ${method}`);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        const httpError = error as HttpException;
        expect(httpError.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(httpError.getResponse()).toMatchObject({
          statusCode: 503,
          error: 'Service Unavailable',
          mensaje: 'Mantenimiento crítico de base de datos.',
          killSwitch: true,
        });
        expect((context as any).setHeaderMock).toHaveBeenCalledWith('X-Kill-Switch', 'true');
      }
    }
  });
});

