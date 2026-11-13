import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import api, {
  MAX_RETRIES,
  RETRY_DELAYS,
  setTestRetryDelays,
  resetTestRetryDelays,
  cancelPendingRetries,
  getActiveRetriesCount,
  getPausedMutationsCount,
  clearAllRetriesAndMutations,
  isIdempotentMethod,
  isNetworkOrTimeoutError,
  flushPendingRetriesAndMutations,
} from './api.js';

describe('TAL-181: Manejador de Reconexión Automática y Reintento de Peticiones', () => {
  let originalWindow;
  let originalOnLineDescriptor;
  let originalAdapter;
  let eventListeners = {};

  const setNavigatorOnline = (val) => {
    try {
      Object.defineProperty(globalThis.navigator, 'onLine', {
        value: val,
        configurable: true,
        writable: true,
      });
    } catch {
      // fallback
    }
  };

  beforeEach(() => {
    eventListeners = {};
    clearAllRetriesAndMutations();
    // Delays rápidos para pruebas automatizadas (10ms, 20ms, 40ms en lugar de 1s, 2s, 4s)
    setTestRetryDelays([10, 20, 40]);

    originalWindow = globalThis.window;
    originalOnLineDescriptor = Object.getOwnPropertyDescriptor(globalThis.navigator, 'onLine');
    originalAdapter = api.defaults.adapter;

    setNavigatorOnline(true);

    globalThis.window = {
      location: { pathname: '/incidencias', origin: 'http://localhost:5173' },
      addEventListener: (evt, handler) => {
        eventListeners[evt] = eventListeners[evt] || [];
        eventListeners[evt].push(handler);
      },
      removeEventListener: (evt, handler) => {
        if (!eventListeners[evt]) return;
        eventListeners[evt] = eventListeners[evt].filter((h) => h !== handler);
      },
      dispatchEvent: (event) => {
        const handlers = eventListeners[event.type] || [];
        handlers.forEach((h) => h(event));
      },
    };
  });

  afterEach(() => {
    clearAllRetriesAndMutations();
    resetTestRetryDelays();
    api.defaults.adapter = originalAdapter;
    globalThis.window = originalWindow;
    if (originalOnLineDescriptor) {
      try {
        Object.defineProperty(globalThis.navigator, 'onLine', originalOnLineDescriptor);
      } catch {
        // fallback
      }
    }
  });

  // -------------------------------------------------------------------------
  // Criterio 1: Reintentos hasta un máximo de 3 veces con backoff exponencial
  // -------------------------------------------------------------------------
  test('Criterio 1: Constantes de backoff exponencial institucionales (1s, 2s, 4s y max 3)', () => {
    assert.equal(MAX_RETRIES, 3, 'El máximo de reintentos debe ser exactamente 3');
    assert.deepEqual(
      RETRY_DELAYS,
      [1000, 2000, 4000],
      'El backoff exponencial debe configurarse en 1s, 2s y 4s (1000ms, 2000ms, 4000ms)',
    );
  });

  test('Criterio 1: Identificación precisa de métodos idempotentes y errores de red o timeout', () => {
    assert.equal(isIdempotentMethod('GET'), true);
    assert.equal(isIdempotentMethod('HEAD'), true);
    assert.equal(isIdempotentMethod('OPTIONS'), true);
    assert.equal(isIdempotentMethod('POST'), false, 'POST no es idempotente');
    assert.equal(isIdempotentMethod('PUT'), false, 'PUT es mutante');
    assert.equal(isIdempotentMethod('DELETE'), false, 'DELETE es mutante');

    const errNetwork = new Error('Network Error');
    errNetwork.code = 'ERR_NETWORK';
    assert.equal(isNetworkOrTimeoutError(errNetwork), true);

    const errTimeout = new Error('timeout of 5000ms exceeded');
    errTimeout.code = 'ECONNABORTED';
    assert.equal(isNetworkOrTimeoutError(errTimeout), true);

    const errHttp404 = new Error('Not Found');
    errHttp404.response = { status: 404, data: {} };
    assert.equal(isNetworkOrTimeoutError(errHttp404), false, 'Errores HTTP con respuesta no son caídas de red');

    const errHttp500 = new Error('Internal Server Error');
    errHttp500.response = { status: 500, data: {} };
    assert.equal(isNetworkOrTimeoutError(errHttp500), false, 'Error 500 con respuesta no es microcorte de red');
  });

  test('Criterio 1: Petición GET fallida por ERR_NETWORK se reintenta hasta un máximo de 3 veces (4 intentos totales)', async () => {
    let callAttempts = 0;

    api.defaults.adapter = async (config) => {
      callAttempts += 1;
      const err = new Error('Network Error');
      err.code = 'ERR_NETWORK';
      err.config = config;
      err.request = {};
      throw err;
    };

    try {
      await api.get('/incidencias?limite=50');
      assert.fail('Debería haber fallado tras agotar los 3 reintentos');
    } catch (finalError) {
      assert.equal(
        callAttempts,
        4,
        'Debe registrar 1 intento inicial + 3 reintentos = 4 intentos en total',
      );
      assert.equal(finalError.code, 'ERR_NETWORK');
    }
  });

  test('Criterio 1: Petición GET fallida en intento 1 y 2 que tiene éxito en intento 3 retorna correctamente', async () => {
    let callAttempts = 0;

    api.defaults.adapter = async (config) => {
      callAttempts += 1;
      if (callAttempts < 3) {
        const err = new Error('timeout exceeded');
        err.code = 'ECONNABORTED';
        err.config = config;
        err.request = {};
        throw err;
      }
      return {
        data: [{ id: 'INC-101', titulo: 'Servidor caído' }],
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const response = await api.get('/incidencias/101');
    assert.equal(callAttempts, 3, 'Debe haber tomado 1 intento inicial + 2 reintentos exitosos');
    assert.equal(response.status, 200);
    assert.equal(response.data[0].id, 'INC-101');
  });

  test('Criterio 1: Al restaurarse la conectividad (evento online) los reintentos en espera se ejecutan de inmediato', async () => {
    // Configuramos delays largos para asegurar que el flush despierte la promesa
    setTestRetryDelays([5000, 5000, 5000]);
    let callAttempts = 0;

    api.defaults.adapter = async (config) => {
      callAttempts += 1;
      if (callAttempts === 1) {
        const err = new Error('Network Error');
        err.code = 'ERR_NETWORK';
        err.config = config;
        err.request = {};
        throw err;
      }
      return {
        data: { reconectado: true },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    const startTime = Date.now();
    const reqPromise = api.get('/dashboard/metricas');

    // Esperar 15ms a que el error ocurra y entre a la cola de reintentos
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(getActiveRetriesCount(), 1, 'Debe haber 1 reintento activo esperando backoff');

    // Disparar reconexión inmediata
    flushPendingRetriesAndMutations();

    const result = await reqPromise;
    const elapsed = Date.now() - startTime;

    assert.equal(result.data.reconectado, true);
    assert.equal(callAttempts, 2);
    assert.ok(elapsed < 1000, `Debe resolverse casi instantáneamente (< 1000ms), tardó ${elapsed}ms`);
  });

  // -------------------------------------------------------------------------
  // Criterio 2: Se cancelan reintentos si el usuario navega a otra pantalla
  // -------------------------------------------------------------------------
  test('Criterio 2: Se cancelan reintentos pendientes si el usuario navega a otra pantalla', async () => {
    setTestRetryDelays([2000, 2000, 2000]);
    let callAttempts = 0;

    api.defaults.adapter = async (config) => {
      callAttempts += 1;
      const err = new Error('Network Error');
      err.code = 'ERR_NETWORK';
      err.config = config;
      err.request = {};
      throw err;
    };

    globalThis.window.location.pathname = '/incidencias';
    const reqPromise = api.get('/incidencias');

    await new Promise((r) => setTimeout(r, 20));
    assert.equal(getActiveRetriesCount(), 1, 'Debe haber 1 reintento programado en /incidencias');

    // El usuario navega a /dashboard
    globalThis.window.location.pathname = '/dashboard';
    cancelPendingRetries('/dashboard');

    assert.equal(getActiveRetriesCount(), 0, 'La cola de reintentos debe quedar vacía');

    try {
      await reqPromise;
      assert.fail('La petición debió rechazarse por cancelación');
    } catch (err) {
      assert.equal(axios.isCancel(err), true, 'El error debe ser de tipo CanceledError');
      assert.equal(callAttempts, 1, 'No deben ejecutarse nuevos reintentos tras la navegación');
    }
  });

  test('Criterio 2: Reintento aborta si la pantalla activa ya cambió al momento de vencer el temporizador', async () => {
    setTestRetryDelays([25, 25, 25]);
    let callAttempts = 0;

    api.defaults.adapter = async (config) => {
      callAttempts += 1;
      const err = new Error('Network Error');
      err.code = 'ERR_NETWORK';
      err.config = config;
      err.request = {};
      throw err;
    };

    globalThis.window.location.pathname = '/inventario';
    const reqPromise = api.get('/activos');

    // Cambiar la pantalla en el navegador a los 10ms sin invocar explícitamente cancelPendingRetries
    setTimeout(() => {
      globalThis.window.location.pathname = '/usuarios';
    }, 10);

    try {
      await reqPromise;
      assert.fail('Debió rechazarse porque la pantalla cambió');
    } catch (err) {
      assert.equal(axios.isCancel(err), true);
      assert.equal(callAttempts, 1, 'No debe ejecutarse reintento al detectar cambio de pantalla');
    }
  });

  // -------------------------------------------------------------------------
  // Criterio 3: No se duplican peticiones POST de asignación o creación
  // -------------------------------------------------------------------------
  test('Criterio 3: Peticiones POST fallidas por caída de red NUNCA se reintentan automáticamente', async () => {
    let postCalls = 0;

    api.defaults.adapter = async (config) => {
      postCalls += 1;
      const err = new Error('Network Error');
      err.code = 'ERR_NETWORK';
      err.config = config;
      err.request = {};
      throw err;
    };

    try {
      await api.post('/incidencias', { titulo: 'Fuga de agua', prioridad: 'ALTA' });
      assert.fail('El POST fallido debió rechazar');
    } catch (err) {
      assert.equal(err.code, 'ERR_NETWORK');
      assert.equal(postCalls, 1, 'Una petición POST fallida solo debe ejecutarse 1 vez y JAMÁS reintentarse');
      assert.equal(getActiveRetriesCount(), 0, 'No debe agregarse a la cola de reintentos');
    }
  });

  test('Criterio 3: Peticiones POST concurrentes de creación o asignación idénticas se deduplican en vuelo', async () => {
    let postExecutionCount = 0;

    api.defaults.adapter = async (config) => {
      if (config.method?.toLowerCase() === 'post') {
        postExecutionCount += 1;
        await new Promise((r) => setTimeout(r, 30));
        return {
          data: { id: 'ORD-999', asignada: true, ejecucion: postExecutionCount },
          status: 201,
          statusText: 'Created',
          headers: {},
          config,
        };
      }
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    const payload = { incidenciaId: 'INC-2026', tecnicoId: 'USR-88' };

    // Simular doble clic rápido en botón "Asignar Técnico"
    const [res1, res2, res3] = await Promise.all([
      api.post('/ordenes-trabajo', payload),
      api.post('/ordenes-trabajo', payload),
      api.post('/ordenes-trabajo', payload),
    ]);

    assert.equal(
      postExecutionCount,
      1,
      'Exactamente 1 petición HTTP real debió llegar al servidor; las concurrentes fueron deduplicadas',
    );
    assert.equal(res1.data.id, 'ORD-999');
    assert.equal(res2.data.id, 'ORD-999');
    assert.equal(res3.data.id, 'ORD-999');
    assert.equal(res1.data.ejecucion, 1);
    assert.equal(res2.data.ejecucion, 1);
    assert.equal(res3.data.ejecucion, 1);
  });

  test('Criterio 3: Solicitud mutante iniciada offline se pausa hasta confirmarse conectividad y se envía una sola vez', async () => {
    setNavigatorOnline(false); // Sin conexión
    let mutationExecutions = 0;

    api.defaults.adapter = async (config) => {
      mutationExecutions += 1;
      return {
        data: { id_incidencia: 'INC-NUEVA-01', creada: true },
        status: 201,
        statusText: 'Created',
        headers: {},
        config,
      };
    };

    const payload = { titulo: 'Servidor sin energía', activoId: 'SRV-01' };
    const mutationPromise = api.post('/incidencias', payload);

    await new Promise((r) => setTimeout(r, 15));
    assert.equal(getPausedMutationsCount(), 1, 'La mutación debe estar pausada esperando conectividad');
    assert.equal(mutationExecutions, 0, 'No debe haberse enviado aún al servidor');

    // Se restaura la conectividad
    setNavigatorOnline(true);
    flushPendingRetriesAndMutations();

    const response = await mutationPromise;
    assert.equal(response.status, 201);
    assert.equal(response.data.id_incidencia, 'INC-NUEVA-01');
    assert.equal(mutationExecutions, 1, 'Debe ejecutarse una sola vez al confirmar conectividad');
    assert.equal(getPausedMutationsCount(), 0);
  });

  test('Criterio 3: Solicitud mutante pausada se cancela si el usuario abandona la pantalla antes de volver online', async () => {
    setNavigatorOnline(false);
    globalThis.window.location.pathname = '/incidencias/nueva';

    api.defaults.adapter = async (config) => ({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    const mutationPromise = api.post('/incidencias', { titulo: 'Test' });

    await new Promise((r) => setTimeout(r, 15));
    assert.equal(getPausedMutationsCount(), 1);

    // Navega a otra pantalla antes de volver la red
    globalThis.window.location.pathname = '/dashboard';
    cancelPendingRetries('/dashboard');

    try {
      await mutationPromise;
      assert.fail('Debió cancelarse la mutación');
    } catch (err) {
      assert.equal(axios.isCancel(err), true);
      assert.equal(getPausedMutationsCount(), 0);
    }
  });
});
