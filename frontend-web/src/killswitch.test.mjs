import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isKillSwitchError,
  extraerMotivo,
  guardarInfoKillSwitch,
  leerInfoKillSwitch,
  limpiarInfoKillSwitch,
  consultarEstadoKillSwitch,
  KILL_SWITCH_POLL_SECONDS,
  MODO_MANTENIMIENTO_PATH,
  MOTIVO_POR_DEFECTO,
} from './services/killSwitchService.js';
import api from './services/api.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (...p) => fs.readFileSync(path.join(rootDir, ...p), 'utf8');

describe('TAL-188: Pantalla Global de Bloqueo por Mantenimiento (Kill Switch)', () => {
  let storage;
  let originalSession;
  let originalAdapter;

  beforeEach(() => {
    storage = new Map();
    originalSession = globalThis.sessionStorage;
    originalAdapter = api.defaults.adapter;
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (k) => (storage.has(k) ? storage.get(k) : null),
        setItem: (k, v) => storage.set(k, String(v)),
        removeItem: (k) => storage.delete(k),
      },
    });
  });

  afterEach(() => {
    api.defaults.adapter = originalAdapter;
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: originalSession });
  });

  // Criterio 1: despliega el motivo exacto enviado por el backend
  test('Criterio 1: detecta el 503 del Kill Switch por cabecera o bandera del cuerpo', () => {
    assert.equal(
      isKillSwitchError({ response: { status: 503, headers: { 'x-kill-switch': 'true' }, data: {} } }),
      true,
    );
    assert.equal(
      isKillSwitchError({ response: { status: 503, headers: {}, data: { killSwitch: true } } }),
      true,
    );
    assert.equal(isKillSwitchError({ response: { status: 503, headers: {}, data: {} } }), false);
    assert.equal(
      isKillSwitchError({ response: { status: 500, headers: { 'x-kill-switch': 'true' }, data: {} } }),
      false,
    );
    assert.equal(isKillSwitchError(new Error('Network Error')), false);
  });

  test('Criterio 1: extrae el motivo exacto del backend (ej. Mantenimiento eléctrico)', () => {
    assert.equal(extraerMotivo({ motivo: 'Mantenimiento eléctrico' }), 'Mantenimiento eléctrico');
    assert.equal(extraerMotivo({ mensaje: 'Corte de energía' }), 'Corte de energía');
    assert.equal(extraerMotivo({}), MOTIVO_POR_DEFECTO);
    assert.equal(extraerMotivo(undefined), MOTIVO_POR_DEFECTO);
  });

  test('Criterio 1: el motivo y el retorno se respaldan para sobrevivir a una recarga', () => {
    guardarInfoKillSwitch({ motivo: 'Mantenimiento eléctrico', from: '/incidencias/nueva' });
    assert.deepEqual(leerInfoKillSwitch(), { motivo: 'Mantenimiento eléctrico', from: '/incidencias/nueva' });
    limpiarInfoKillSwitch();
    assert.equal(leerInfoKillSwitch(), null);
  });

  test('Criterio 1: la vista muestra el motivo y el interceptor redirige a ella', () => {
    const vista = leer('src', 'views', 'ModoMantenimiento.jsx');
    assert.ok(vista.includes('{info.motivo}'), 'La vista debe renderizar el motivo del backend');

    const interceptor = leer('src', 'components', 'AxiosInterceptor.jsx');
    assert.ok(interceptor.includes('isKillSwitchError(error)'));
    assert.ok(interceptor.includes('navigate(MODO_MANTENIMIENTO_PATH'));
    assert.ok(interceptor.includes('extraerMotivo(error.response.data)'));

    const app = leer('src', 'App.jsx');
    assert.ok(app.includes('path="/modo-mantenimiento"'));
    assert.equal(MODO_MANTENIMIENTO_PATH, '/modo-mantenimiento');
  });

  // Criterio 2: comprueba automáticamente cada 15 segundos
  test('Criterio 2: el intervalo de comprobación es de 15 segundos y la vista lo aplica', () => {
    assert.equal(KILL_SWITCH_POLL_SECONDS, 15);
    const vista = leer('src', 'views', 'ModoMantenimiento.jsx');
    assert.ok(vista.includes('KILL_SWITCH_POLL_SECONDS'));
    assert.ok(vista.includes('consultarEstadoKillSwitch()'));
    assert.ok(vista.includes('reanudar()'), 'Debe volver a la pantalla previa si el servicio se reanudó');
  });

  test('Criterio 2: consulta GET /kill-switch/status sin reintentos automáticos', async () => {
    let capturado;
    api.defaults.adapter = async (config) => {
      capturado = config;
      return { data: { activo: false }, status: 200, statusText: 'OK', headers: {}, config };
    };
    const estado = await consultarEstadoKillSwitch();
    assert.equal(estado.activo, false);
    assert.equal(capturado.method, 'get');
    assert.ok(capturado.url.endsWith('/kill-switch/status'));
    assert.equal(capturado.skipRetry, true);
  });

  // Criterio 3: no borra borradores locales
  test('Criterio 3: los formularios persisten borradores en localStorage y la pantalla no los borra', () => {
    const hook = leer('src', 'hooks', 'useDraftState.js');
    assert.ok(hook.includes('localStorage.setItem'));
    assert.ok(hook.includes("'draft:'"));

    const formularios = [
      ['src', 'components', 'FormularioReporteIncidencia.jsx'],
      ['src', 'components', 'ModalNuevaIncidenciaMobile.jsx'],
      ['src', 'components', 'PlanificarMantenimientoForm.jsx'],
      ['src', 'views', 'AsignarTecnico.jsx'],
    ];
    for (const ruta of formularios) {
      assert.ok(leer(...ruta).includes('useDraftState('), `${ruta.at(-1)} debe usar borradores locales`);
    }

    const vista = leer('src', 'views', 'ModoMantenimiento.jsx');
    const interceptor = leer('src', 'components', 'AxiosInterceptor.jsx');
    for (const codigo of [vista, interceptor]) {
      assert.ok(!codigo.includes('clearDrafts'), 'Ni la vista ni el interceptor deben borrar borradores');
      assert.ok(!codigo.includes('localStorage.clear'), 'No debe limpiarse localStorage');
      assert.ok(!codigo.includes('localStorage.removeItem'), 'No debe eliminarse nada de localStorage');
    }
  });
});
