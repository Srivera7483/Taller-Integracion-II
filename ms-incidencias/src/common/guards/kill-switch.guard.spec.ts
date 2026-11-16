import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { KillSwitchGuard } from './kill-switch.guard';

describe('KillSwitchGuard (TAL-4 & TAL-210)', () => {
  let guard: KillSwitchGuard;
  const originalEnv = process.env;
  let tempEnvPath: string;

  beforeEach(() => {
    process.env = { ...originalEnv };
    // Aislamos la ruta de .env en disco para que el .env local no interfiera con los tests
    tempEnvPath = path.join(os.tmpdir(), `.env.test.${Date.now()}.${Math.random()}`);
    process.env.ENV_FILE_PATH = tempEnvPath;
    guard = new KillSwitchGuard();
  });

  afterEach(() => {
    if (tempEnvPath && fs.existsSync(tempEnvPath)) {
      fs.unlinkSync(tempEnvPath);
    }
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

  it('arranca en modo seguro por defecto (inactivo) cuando no hay variables definidas', () => {
    delete process.env.KILL_SWITCH_INCIDENCIAS_ENABLED;
    delete process.env.KILL_SWITCH_ENABLED;

    expect(guard.isKillSwitchActive()).toBe(false);
    expect(guard.canActivate(createMockContext('POST'))).toBe(true);
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

  it('TAL-210: conmuta en caliente al modificar KILL_SWITCH_INCIDENCIAS_ENABLED en archivo .env sin reiniciar', () => {
    // 1. Estado inicial en disco: false
    fs.writeFileSync(tempEnvPath, 'KILL_SWITCH_INCIDENCIAS_ENABLED=false\n', 'utf-8');
    expect(guard.canActivate(createMockContext('POST'))).toBe(true);

    // 2. Modificación en caliente en disco: true (sin recrear instancia del guard)
    fs.writeFileSync(
      tempEnvPath,
      'KILL_SWITCH_INCIDENCIAS_ENABLED=true\nKILL_SWITCH_MOTIVO="Suspensión en caliente"\n',
      'utf-8',
    );
    expect(() => guard.canActivate(createMockContext('POST'))).toThrow(HttpException);
    expect(guard.canActivate(createMockContext('GET'))).toBe(true);

    // 3. Reversión en caliente en disco: false
    fs.writeFileSync(tempEnvPath, 'KILL_SWITCH_INCIDENCIAS_ENABLED=false\n', 'utf-8');
    expect(guard.canActivate(createMockContext('POST'))).toBe(true);
  });

  it('TAL-210: permite conmutación directa en memoria mediante setHotState y retorno a .env', () => {
    delete process.env.KILL_SWITCH_INCIDENCIAS_ENABLED;
    expect(guard.canActivate(createMockContext('DELETE'))).toBe(true);

    guard.setHotState(true, 'Corte administrativo inmediato');
    expect(() => guard.canActivate(createMockContext('DELETE'))).toThrow(HttpException);

    guard.setHotState(null);
    expect(guard.canActivate(createMockContext('DELETE'))).toBe(true);
  });
});