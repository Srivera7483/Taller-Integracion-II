import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  OFFLINE_DB_VERSION,
  STORE_NAMES,
  createInMemoryIndexedDB,
  setIndexedDBProvider,
  encolarAccionOffline,
  obtenerColaAccionesOffline,
  guardarOrdenesOffline,
  obtenerOrdenPorIdOffline,
  guardarEstadosOffline,
  guardarContextoSincronizacion,
  obtenerContextoSincronizacion,
  limpiarDatosOffline,
  openOfflineDb,
} from '../storage/offlineDb.js';
import {
  MENSAJES_SYNC,
  SYNC_TAG,
  TAMANO_MAXIMO_LOTE,
  obtenerAccionesPendientes,
  procesarColaOffline,
} from './backgroundSync.js';
import {
  encolarAccionSincronizable,
  iniciarSincronizacionAutomatica,
  solicitarSincronizacion,
  soportaBackgroundSync,
} from './syncManager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..', '..');
const leer = (...partes) => fs.readFileSync(path.join(rootDir, ...partes), 'utf8');

const API_BASE = 'http://localhost:3000/api/v1';

const crearLocalStorage = (datos = {}) => {
  const store = new Map(Object.entries(datos));
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
};

/**
 * Simula el servidor de TAL-192: crea recursos con id real y marca ERROR las incidencias sin título.
 */
const crearRespuestaServidor = (acciones) => {
  let contador = 0;
  const detalle = acciones.map((accion) => {
    if (accion.tipo === 'crear_incidencia' && !accion.payload?.titulo) {
      return {
        id_accion_local: accion.id_accion_local,
        estado: 'ERROR',
        motivo: 'titulo es obligatorio en el payload',
      };
    }
    contador += 1;
    return {
      id_accion_local: accion.id_accion_local,
      estado: 'OK',
      recurso_id:
        accion.tipo === 'crear_incidencia'
          ? `inc-real-${accion.id_accion_local}`
          : accion.payload?.id_incidencia || `rec-${contador}`,
    };
  });
  const errores = detalle.filter((d) => d.estado === 'ERROR').length;
  return {
    statusCode: errores > 0 ? 207 : 200,
    message: 'procesado',
    resumen: { total: detalle.length, exitosos: detalle.length - errores, errores },
    detalle,
  };
};

const crearFetchSimulado = (llamadas, manejador) => async (url, init) => {
  const body = JSON.parse(init.body);
  llamadas.push({ url, init, body });
  const { status, data } = manejador
    ? await manejador(body)
    : { status: 200, data: crearRespuestaServidor(body.acciones) };
  return { status, json: async () => data };
};

const esperar = (ms = 25) => new Promise((resolve) => setTimeout(resolve, ms));

describe('TAL-196: Cola de Sincronización en Segundo Plano (Background Sync)', () => {
  let originalLocalStorage;
  let originalFetch;
  let mensajesClientes;
  const manejadoresSw = {};

  beforeEach(async () => {
    setIndexedDBProvider(createInMemoryIndexedDB());
    await limpiarDatosOffline();
    originalLocalStorage = globalThis.localStorage;
    originalFetch = globalThis.fetch;
    globalThis.localStorage = crearLocalStorage({
      token: 'jwt-tecnico',
      usuario: JSON.stringify({ id_usuario: 'tec-01' }),
    });

    mensajesClientes = [];
    globalThis.self = {
      __WB_MANIFEST: [],
      addEventListener: (tipo, manejador) => {
        (manejadoresSw[tipo] ||= []).push(manejador);
      },
      skipWaiting: () => {},
      registration: { scope: 'http://localhost/' },
      location: { origin: 'http://localhost' },
      clients: {
        claim: async () => {},
        matchAll: async () => [{ postMessage: (mensaje) => mensajesClientes.push(mensaje) }],
      },
    };
  });

  afterEach(async () => {
    globalThis.localStorage = originalLocalStorage;
    globalThis.fetch = originalFetch;
    delete globalThis.self;
    await limpiarDatosOffline();
  });

  const dispararEventoSync = async (tag = SYNC_TAG) => {
    await import('../../sw.js');
    let promesa = Promise.resolve();
    const evento = { tag, waitUntil: (p) => (promesa = p) };
    (manejadoresSw.sync || []).forEach((manejador) => manejador(evento));
    return promesa;
  };

  test('Esquema: la versión 2 de IndexedDB incluye la tienda sync_meta y se limpia al cerrar sesión', async () => {
    assert.equal(OFFLINE_DB_VERSION, 2);
    const db = await openOfflineDb();
    assert.equal(db.objectStoreNames.contains(STORE_NAMES.SYNC_META), true);

    await guardarContextoSincronizacion({ token: 'jwt-secreto', apiBaseUrl: `${API_BASE}/` });
    const contexto = await obtenerContextoSincronizacion();
    assert.equal(contexto.token, 'jwt-secreto');
    assert.equal(contexto.apiBaseUrl, API_BASE, 'Debe normalizar la URL base sin barra final');

    await limpiarDatosOffline();
    assert.equal(
      await obtenerContextoSincronizacion(),
      null,
      'Las credenciales no deben sobrevivir al logout',
    );
  });

  test('Criterio 1: el evento sync del Service Worker lee la cola y la envía al endpoint masivo sin intervención del usuario', async () => {
    await guardarContextoSincronizacion({ token: 'jwt-tecnico', apiBaseUrl: API_BASE });
    await encolarAccionOffline({
      id: 'acc-1',
      tipo: 'CREAR_INCIDENCIA',
      endpoint: '/sincronizacion/lote',
      payload: {
        id_activo: 'ACT-1',
        titulo: 'Falla de red',
        descripcion: 'Sin enlace',
        prioridad: 'alta',
      },
      id_registro_local: 'local-inc-1',
      creado_en: '2026-11-20T10:00:00.000Z',
    });
    await encolarAccionOffline({
      id: 'acc-2',
      tipo: 'actualizar_estado',
      endpoint: '/sincronizacion/lote',
      payload: { id_incidencia: 'inc-77', id_estado: 6 },
      creado_en: '2026-11-20T10:05:00.000Z',
    });
    // Las mutaciones pausadas de TAL-181 las reanuda la propia página: NO deben enviarse por Background Sync.
    await encolarAccionOffline({
      id: 'paused-1',
      tipo: 'MUTACION_PAUSADA_OFFLINE',
      endpoint: '/incidencias',
      payload: { titulo: 'No sincronizar' },
    });

    const llamadas = [];
    globalThis.fetch = crearFetchSimulado(llamadas);

    await dispararEventoSync();

    assert.equal(llamadas.length, 1, 'Debe enviar un único lote cuando no hay dependencias');
    assert.equal(llamadas[0].url, `${API_BASE}/sincronizacion/lote`);
    assert.equal(llamadas[0].init.method, 'POST');
    assert.equal(llamadas[0].init.headers.Authorization, 'Bearer jwt-tecnico');
    assert.deepEqual(
      llamadas[0].body.acciones.map((a) => a.id_accion_local),
      ['acc-1', 'acc-2'],
    );
    assert.deepEqual(llamadas[0].body.acciones[0], {
      id_accion_local: 'acc-1',
      tipo: 'crear_incidencia',
      payload: {
        id_activo: 'ACT-1',
        titulo: 'Falla de red',
        descripcion: 'Sin enlace',
        prioridad: 'alta',
      },
      timestamp_local: '2026-11-20T10:00:00.000Z',
    });

    const pendientes = await obtenerAccionesPendientes();
    assert.equal(pendientes.length, 0, 'No deben quedar acciones sincronizables pendientes');

    const sincronizadas = await obtenerColaAccionesOffline('sincronizado');
    assert.deepEqual(
      sincronizadas.map((a) => a.id),
      ['acc-1', 'acc-2'],
    );
    assert.equal(sincronizadas[0].recurso_id, 'inc-real-acc-1');
    assert.ok(sincronizadas[0].sincronizado_en);

    assert.equal(mensajesClientes[0]?.type, MENSAJES_SYNC.COMPLETADA);
    assert.equal(mensajesClientes[0].resumen.sincronizadas, 2);
  });

  test('Criterio 2: actualiza el estado de los registros locales tras confirmación del servidor y marca como error los fallidos', async () => {
    await guardarContextoSincronizacion({ token: 'jwt-tecnico', apiBaseUrl: API_BASE });
    await guardarEstadosOffline([{ id_estado: 6, nombre_estado: 'Resuelta' }]);
    await guardarOrdenesOffline([
      {
        id: 'local-inc-1',
        id_incidencia: 'local-inc-1',
        titulo: 'Falla local',
        estado: 'Reportada',
        pendiente_sync: true,
      },
      {
        id: 'local-inc-2',
        id_incidencia: 'local-inc-2',
        titulo: '',
        estado: 'Reportada',
        pendiente_sync: true,
      },
      {
        id: 'inc-77',
        id_incidencia: 'inc-77',
        titulo: 'Switch caído',
        estado: { id_estado: 3, nombre_estado: 'Asignada' },
        pendiente_sync: true,
      },
    ]);

    await encolarAccionOffline({
      id: 'ok-crear',
      tipo: 'crear_incidencia',
      endpoint: '/sincronizacion/lote',
      payload: { id_activo: 'ACT-1', titulo: 'Falla local', descripcion: 'x' },
      id_registro_local: 'local-inc-1',
      creado_en: '2026-11-20T10:00:00.000Z',
    });
    await encolarAccionOffline({
      id: 'fallo-crear',
      tipo: 'crear_incidencia',
      endpoint: '/sincronizacion/lote',
      payload: { id_activo: 'ACT-2', titulo: '', descripcion: 'x' },
      id_registro_local: 'local-inc-2',
      creado_en: '2026-11-20T10:01:00.000Z',
    });
    await encolarAccionOffline({
      id: 'ok-estado',
      tipo: 'actualizar_estado',
      endpoint: '/sincronizacion/lote',
      payload: { id_incidencia: 'inc-77', id_estado: 6 },
      creado_en: '2026-11-20T10:02:00.000Z',
    });
    await encolarAccionOffline({
      id: 'ok-evidencia',
      tipo: 'subir_evidencia',
      endpoint: '/sincronizacion/lote',
      payload: {
        id_incidencia: 'inc-77',
        id_tipo_evidencia: 1,
        url_evidencia: 'https://res.cloudinary.com/demo/foto.jpg',
      },
      creado_en: '2026-11-20T10:03:00.000Z',
    });

    globalThis.fetch = crearFetchSimulado([]);
    await dispararEventoSync();

    // Incidencia creada: el registro temporal se reemplaza por el id real confirmado por el servidor
    assert.equal(
      await obtenerOrdenPorIdOffline('local-inc-1').then((o) => o?.id === 'local-inc-1'),
      false,
    );
    const creada = await obtenerOrdenPorIdOffline('inc-real-ok-crear');
    assert.ok(creada, 'Debe existir el registro local con el identificador real');
    assert.equal(creada.titulo, 'Falla local');
    assert.equal(creada.estado_sincronizacion, 'sincronizado');
    assert.equal(creada.pendiente_sync, false);
    assert.ok(creada.sincronizado_en);

    // Cambio de estado y evidencia reflejados localmente
    const actualizada = await obtenerOrdenPorIdOffline('inc-77');
    assert.equal(actualizada.estado_normalizado, 'Resuelta');
    assert.equal(actualizada.id_estado, 6);
    assert.equal(actualizada.estado_sincronizacion, 'sincronizado');
    assert.equal(actualizada.pendiente_sync, false);
    assert.equal(actualizada.evidencias.length, 1);
    assert.equal(actualizada.evidencias[0].url_evidencia, 'https://res.cloudinary.com/demo/foto.jpg');

    // Estado de los registros en cola_acciones actualizado a 'sincronizado' o 'error'
    const sincronizadas = await obtenerColaAccionesOffline('sincronizado');
    assert.deepEqual(
      sincronizadas.map((a) => a.id),
      ['ok-crear', 'ok-estado', 'ok-evidencia'],
    );

    const conError = await obtenerColaAccionesOffline('error');
    assert.deepEqual(
      conError.map((a) => a.id),
      ['fallo-crear'],
    );
    assert.match(conError[0].ultimo_error, /titulo es obligatorio/);
    const fallida = await obtenerOrdenPorIdOffline('local-inc-2');
    assert.equal(fallida.pendiente_sync, true);
  });

  test('Dependencias: una evidencia sobre una incidencia creada offline usa el id real devuelto por el servidor', async () => {
    await guardarContextoSincronizacion({ token: 'jwt-tecnico', apiBaseUrl: API_BASE });
    await guardarOrdenesOffline([
      {
        id: 'local-inc-9',
        id_incidencia: 'local-inc-9',
        titulo: 'Con foto',
        estado: 'Reportada',
        pendiente_sync: true,
      },
    ]);
    await encolarAccionOffline({
      id: 'crear-9',
      tipo: 'crear_incidencia',
      endpoint: '/sincronizacion/lote',
      payload: { id_activo: 'ACT-9', titulo: 'Con foto', descripcion: 'x' },
      id_registro_local: 'local-inc-9',
      creado_en: '2026-11-20T11:00:00.000Z',
    });
    await encolarAccionOffline({
      id: 'foto-9',
      tipo: 'subir_evidencia',
      endpoint: '/sincronizacion/lote',
      payload: {
        id_incidencia: 'local-inc-9',
        id_tipo_evidencia: 1,
        url_evidencia: 'https://res.cloudinary.com/demo/9.jpg',
      },
      creado_en: '2026-11-20T11:01:00.000Z',
    });

    const llamadas = [];
    globalThis.fetch = crearFetchSimulado(llamadas);
    await dispararEventoSync();

    assert.equal(
      llamadas.length,
      2,
      'Primero se crean las incidencias y luego se envían las acciones dependientes',
    );
    assert.equal(llamadas[0].body.acciones[0].tipo, 'crear_incidencia');
    assert.equal(llamadas[1].body.acciones[0].tipo, 'subir_evidencia');
    assert.equal(llamadas[1].body.acciones[0].payload.id_incidencia, 'inc-real-crear-9');
    assert.equal((await obtenerAccionesPendientes()).length, 0);
    const local = await obtenerOrdenPorIdOffline('inc-real-crear-9');
    assert.equal(local.evidencias.length, 1);
  });

  test('Lotes: respeta el máximo de 50 acciones por llamada HTTP', async () => {
    for (let i = 0; i < TAMANO_MAXIMO_LOTE + 5; i += 1) {
      await encolarAccionOffline({
        id: `est-${String(i).padStart(3, '0')}`,
        tipo: 'actualizar_estado',
        endpoint: '/sincronizacion/lote',
        payload: { id_incidencia: `inc-${i}`, id_estado: 2 },
        creado_en: new Date(Date.UTC(2026, 10, 20, 10, 0, i)).toISOString(),
      });
    }
    const tamanos = [];
    const resumen = await procesarColaOffline({
      enviarLote: async (acciones) => {
        tamanos.push(acciones.length);
        return { status: 200, data: crearRespuestaServidor(acciones) };
      },
    });
    assert.deepEqual(tamanos, [50, 5]);
    assert.equal(resumen.sincronizadas, 55);
  });

  test('Resiliencia: ante fallos de red o 5xx revierte a pendiente y deja que el navegador reintente; ante 401 avisa a la página', async () => {
    await guardarContextoSincronizacion({ token: 'jwt-vencido', apiBaseUrl: API_BASE });
    await encolarAccionOffline({
      id: 'acc-red',
      tipo: 'actualizar_estado',
      endpoint: '/sincronizacion/lote',
      payload: { id_incidencia: 'inc-1', id_estado: 2 },
    });

    // 1. Sin red: el evento sync se rechaza para que el navegador lo reintente
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };
    await assert.rejects(dispararEventoSync(), /Failed to fetch/);
    let cola = await obtenerColaAccionesOffline();
    assert.equal(cola[0].estado_sincronizacion, 'pendiente');
    assert.equal(cola[0].intentos, 0, 'Un fallo de transporte no consume intentos');

    // 2. Error 503 (por ejemplo Kill Switch activo): también se reintenta luego
    globalThis.fetch = crearFetchSimulado([], async () => ({
      status: 503,
      data: { motivo: 'Mantenimiento' },
    }));
    await assert.rejects(dispararEventoSync());
    cola = await obtenerColaAccionesOffline();
    assert.equal(cola[0].estado_sincronizacion, 'pendiente');

    // 3. Token vencido: no se reintenta en bucle; la página renueva la sesión y sincroniza
    globalThis.fetch = crearFetchSimulado([], async () => ({
      status: 401,
      data: { message: 'Unauthorized' },
    }));
    await dispararEventoSync();
    cola = await obtenerColaAccionesOffline();
    assert.equal(cola[0].estado_sincronizacion, 'pendiente');
    assert.ok(mensajesClientes.some((m) => m.type === MENSAJES_SYNC.AUTH_REQUERIDA));
  });

  test('Service Worker sin credenciales guardadas omite la sincronización (la página la realizará al abrirse)', async () => {
    await encolarAccionOffline({
      id: 'acc-sin-token',
      tipo: 'actualizar_estado',
      endpoint: '/sincronizacion/lote',
      payload: { id_incidencia: 'inc-1', id_estado: 2 },
    });
    let invocado = false;
    globalThis.fetch = async () => {
      invocado = true;
      throw new Error('no debe invocarse');
    };
    await dispararEventoSync();
    assert.equal(invocado, false);
    assert.equal((await obtenerColaAccionesOffline())[0].estado_sincronizacion, 'pendiente');
  });

  test('Criterio 3: sin Background Sync API sincroniza en primer plano (fallback) y con soporte registra el tag sync', async () => {
    await encolarAccionSincronizable({
      tipo: 'actualizar_estado',
      payload: { id_incidencia: 'inc-5', id_estado: 6 },
    });

    // Navegador SIN SyncManager (Safari / Firefox)
    assert.equal(
      soportaBackgroundSync({ windowRef: {}, navigatorRef: { serviceWorker: {} } }),
      false,
    );
    const enviados = [];
    const modo = await solicitarSincronizacion({
      windowRef: {},
      navigatorRef: { onLine: true },
      storage: globalThis.localStorage,
      enviarLote: async (acciones) => {
        enviados.push(acciones);
        return { status: 200, data: crearRespuestaServidor(acciones) };
      },
    });
    assert.equal(modo, 'primer-plano');
    assert.equal(enviados.length, 1);
    assert.equal((await obtenerAccionesPendientes()).length, 0);

    // Navegador CON SyncManager: registra el tag y delega en el Service Worker
    await encolarAccionSincronizable({
      tipo: 'actualizar_estado',
      payload: { id_incidencia: 'inc-6', id_estado: 6 },
    });
    let tagRegistrado = null;
    const navigatorConSoporte = {
      onLine: true,
      serviceWorker: {
        ready: Promise.resolve({
          sync: {
            register: async (tag) => {
              tagRegistrado = tag;
            },
          },
        }),
      },
    };
    const opcionesSoporte = {
      windowRef: { SyncManager: class {} },
      navigatorRef: navigatorConSoporte,
    };
    assert.equal(soportaBackgroundSync(opcionesSoporte), true);
    const modoSw = await solicitarSincronizacion({
      ...opcionesSoporte,
      storage: globalThis.localStorage,
      enviarLote: async () => {
        throw new Error('No debe sincronizar en primer plano si Background Sync está disponible');
      },
    });
    assert.equal(modoSw, 'background-sync');
    assert.equal(tagRegistrado, SYNC_TAG);
    assert.equal((await obtenerAccionesPendientes()).length, 1);
    assert.equal(
      (await obtenerContextoSincronizacion()).token,
      'jwt-tecnico',
      'El SW recibe las credenciales vigentes',
    );

    // Si el registro del tag falla, también cae al fallback
    const modoFallo = await solicitarSincronizacion({
      windowRef: { SyncManager: class {} },
      navigatorRef: { onLine: true, serviceWorker: { ready: Promise.reject(new Error('sin SW')) } },
      storage: globalThis.localStorage,
      enviarLote: async (acciones) => ({ status: 200, data: crearRespuestaServidor(acciones) }),
    });
    assert.equal(modoFallo, 'primer-plano');
    assert.equal((await obtenerAccionesPendientes()).length, 0);
  });

  test('Criterio 1 (fallback): al recuperar la conexión (evento online) la cola se sincroniza automáticamente', async () => {
    const escuchas = {};
    const windowSimulada = {
      addEventListener: (tipo, fn) => (escuchas[tipo] ||= []).push(fn),
      removeEventListener: (tipo, fn) => {
        escuchas[tipo] = (escuchas[tipo] || []).filter((f) => f !== fn);
      },
      dispatchEvent: () => true,
    };
    const navegador = { onLine: false };
    const enviarLote = async (acciones) => ({
      status: 200,
      data: crearRespuestaServidor(acciones),
    });

    const detener = iniciarSincronizacionAutomatica({
      windowRef: windowSimulada,
      navigatorRef: navegador,
      storage: globalThis.localStorage,
      enviarLote,
      intervaloFallbackMs: 60000,
    });

    await encolarAccionSincronizable({
      tipo: 'actualizar_estado',
      payload: { id_incidencia: 'inc-8', id_estado: 6 },
    });
    await esperar();
    assert.equal(
      (await obtenerAccionesPendientes()).length,
      1,
      'Sin conexión la acción permanece en cola',
    );

    navegador.onLine = true;
    (escuchas.online || []).forEach((fn) => fn());
    await esperar(60);
    assert.equal(
      (await obtenerAccionesPendientes()).length,
      0,
      'Al volver la conexión se sincroniza sin intervención manual',
    );

    detener();
    assert.equal((escuchas.online || []).length, 0);
  });

  test('Integración: vite usa injectManifest, sw.js escucha sync y main.jsx activa la sincronización automática', () => {
    const vite = leer('vite.config.js');
    assert.match(vite, /strategies:\s*'injectManifest'/);
    assert.match(vite, /srcDir:\s*'src'/);
    assert.match(vite, /filename:\s*'sw\.js'/);

    const sw = leer('src', 'sw.js');
    assert.match(sw, /addEventListener\('sync'/);
    assert.match(sw, /SYNC_TAG/);
    assert.match(sw, /sincronizarColaEnServiceWorker/);
    assert.match(sw, /self\.__WB_MANIFEST/);

    const main = leer('src', 'main.jsx');
    assert.match(main, /iniciarSincronizacionAutomatica\(\)/);
  });
});
