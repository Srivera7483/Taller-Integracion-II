import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFLINE_DB_NAME,
  OFFLINE_DB_VERSION,
  STORE_NAMES,
  getOfflineDbSchema,
  openOfflineDb,
  createInMemoryIndexedDB,
  setIndexedDBProvider,
  guardarActivosOffline,
  obtenerActivosOffline,
  obtenerActivoPorIdOffline,
  guardarOrdenesOffline,
  obtenerOrdenesOffline,
  obtenerOrdenPorIdOffline,
  guardarEstadosOffline,
  obtenerEstadosOffline,
  encolarAccionOffline,
  obtenerColaAccionesOffline,
  actualizarEstadoAccionOffline,
  eliminarAccionOffline,
  limpiarDatosOffline,
} from './offlineDb.js';
import api, {
  setTestRetryDelays,
  resetTestRetryDelays,
  clearAllRetriesAndMutations,
} from '../api.js';
import { limpiarSesion } from '../authService.js';

describe('TAL-195: Implementación de IndexedDB en Frontend para Catálogo Offline', () => {
  let originalAdapter;
  let originalLocalStorage;

  beforeEach(async () => {
    setIndexedDBProvider(createInMemoryIndexedDB());
    await limpiarDatosOffline();
    originalAdapter = api.defaults.adapter;
    originalLocalStorage = globalThis.localStorage;
    setTestRetryDelays([5, 10, 15]);

    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
  });

  afterEach(async () => {
    clearAllRetriesAndMutations();
    resetTestRetryDelays();
    api.defaults.adapter = originalAdapter;
    globalThis.localStorage = originalLocalStorage;
    await limpiarDatosOffline();
  });

  test('Esquema IndexedDB: Define correctamente las tiendas activos, ordenes, estados y cola_acciones', async () => {
    const schema = getOfflineDbSchema();
    assert.equal(schema.dbName, OFFLINE_DB_NAME);
    assert.equal(schema.version, OFFLINE_DB_VERSION);
    assert.ok(schema.stores[STORE_NAMES.ACTIVOS], 'Debe definir la tienda activos');
    assert.ok(schema.stores[STORE_NAMES.ORDENES], 'Debe definir la tienda ordenes');
    assert.ok(schema.stores[STORE_NAMES.ESTADOS], 'Debe definir la tienda estados');
    assert.ok(schema.stores[STORE_NAMES.COLA_ACCIONES], 'Debe definir la tienda cola_acciones');

    const db = await openOfflineDb();
    assert.equal(db.name, OFFLINE_DB_NAME);
    assert.equal(db.objectStoreNames.contains('activos'), true);
    assert.equal(db.objectStoreNames.contains('ordenes'), true);
    assert.equal(db.objectStoreNames.contains('estados'), true);
    assert.equal(db.objectStoreNames.contains('cola_acciones'), true);
  });

  test('Criterio 1: Guarda y consulta asíncronamente el catálogo de activos, órdenes del técnico y estados', async () => {
    const activosDemo = [
      {
        id_activo: 'ACT-100',
        codigoQr: 'QR-ACT-100',
        nombre: 'Servidor Dell PowerEdge R750',
        categoria: 'Servidores',
        ubicacion: 'Data Center Principal',
        estado: 'Operativo',
      },
      {
        id_activo: 'ACT-200',
        codigoQr: 'QR-ACT-200',
        nombre: 'Switch Cisco Catalyst 9300',
        categoria: 'Redes',
        ubicacion: 'Sala Comunicaciones Piso 2',
        estado: 'En Mantenimiento',
      },
    ];

    const ordenesDemo = [
      {
        id_incidencia: 'INC-501',
        id_orden: 'ORD-901',
        titulo: 'Reemplazo de fuente redundante',
        id_activo: 'ACT-100',
        id_tecnico: 'tec-01',
        estado: { id_estado: 4, nombre_estado: 'En Progreso' },
        prioridad: 'Alta',
      },
      {
        id_incidencia: 'INC-502',
        id_orden: 'ORD-902',
        titulo: 'Revisión de puertos PoE',
        id_activo: 'ACT-200',
        id_tecnico: 'tec-02',
        estado: 'Asignada',
        prioridad: 'Media',
      },
    ];

    await guardarActivosOffline(activosDemo);
    await guardarOrdenesOffline(ordenesDemo);

    const todosActivos = await obtenerActivosOffline();
    assert.equal(todosActivos.length, 2);

    const filtradosRedes = await obtenerActivosOffline({ categoria: 'Redes' });
    assert.equal(filtradosRedes.length, 1);
    assert.equal(filtradosRedes[0].codigoQr, 'QR-ACT-200');

    const activoPorQr = await obtenerActivoPorIdOffline('QR-ACT-100');
    assert.ok(activoPorQr);
    assert.equal(activoPorQr.nombre, 'Servidor Dell PowerEdge R750');

    const ordenesTecnico1 = await obtenerOrdenesOffline({ id_tecnico: 'tec-01' });
    assert.equal(ordenesTecnico1.length, 1);
    assert.equal(ordenesTecnico1[0].id_orden, 'ORD-901');
    assert.equal(ordenesTecnico1[0].estado_normalizado, 'En Progreso');

    const ordenPorId = await obtenerOrdenPorIdOffline('ORD-902');
    assert.ok(ordenPorId);
    assert.equal(ordenPorId.id_incidencia, 'INC-502');

    const estados = await obtenerEstadosOffline();
    assert.ok(estados.length >= 2, 'Debe extraer y almacenar estados de activos y órdenes');
  });

  test('Criterio 1 y 2: Al navegar con internet guarda en segundo plano y al perder conexión lee desde IndexedDB sin arrojar error', async () => {
    let modoOffline = false;

    api.defaults.adapter = async (config) => {
      if (modoOffline) {
        const err = new Error('Network Error');
        err.code = 'ERR_NETWORK';
        err.config = config;
        err.request = {};
        throw err;
      }

      if (config.url.includes('/activos')) {
        return {
          data: {
            datos: [
              {
                id: 'ACT-ONLINE-01',
                codigoQr: 'ACT-ONLINE-01',
                nombre: 'Router Frontera BGP',
                categoria: 'Redes',
                ubicacion: 'Nodo Central',
                estado: 'Operativo',
              },
            ],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      if (config.url.includes('/incidencias')) {
        return {
          data: {
            datos: [
              {
                id_incidencia: 'INC-ONLINE-01',
                id_orden: 'ORD-ONLINE-01',
                titulo: 'Latencia elevada en enlace troncal',
                id_activo: 'ACT-ONLINE-01',
                id_tecnico: 'tec-01',
                estado: 'Asignada',
              },
            ],
          },
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        };
      }

      return { data: [], status: 200, statusText: 'OK', headers: {}, config };
    };

    // 1. Navegación con internet: guarda automáticamente en segundo plano en IndexedDB
    const resActivosOnline = await api.get('/activos');
    const resOrdenesOnline = await api.get('/incidencias?limite=50');
    assert.equal(resActivosOnline.status, 200);
    assert.equal(resOrdenesOnline.status, 200);

    // Dar un tick para que concluya la escritura asíncrona en segundo plano
    await new Promise((r) => setTimeout(r, 20));

    const activosEnDb = await obtenerActivosOffline();
    const ordenesEnDb = await obtenerOrdenesOffline();
    assert.equal(activosEnDb.length, 1);
    assert.equal(activosEnDb[0].id, 'ACT-ONLINE-01');
    assert.equal(ordenesEnDb.length, 1);
    assert.equal(ordenesEnDb[0].id_incidencia, 'INC-ONLINE-01');

    // 2. Se pierde la conexión: api.get lee los datos desde IndexedDB en lugar de arrojar error
    modoOffline = true;

    const resActivosOffline = await api.get('/activos');
    assert.equal(resActivosOffline.status, 200);
    assert.equal(resActivosOffline.fromOfflineCache, true);
    assert.equal(resActivosOffline.data.datos.length, 1);
    assert.equal(resActivosOffline.data.datos[0].nombre, 'Router Frontera BGP');

    const resOrdenesOffline = await api.get('/incidencias?limite=50');
    assert.equal(resOrdenesOffline.status, 200);
    assert.equal(resOrdenesOffline.fromOfflineCache, true);
    assert.equal(resOrdenesOffline.data.datos.length, 1);
    assert.equal(resOrdenesOffline.data.datos[0].id_orden, 'ORD-ONLINE-01');

    const resDetalleOrdenOffline = await api.get('/ordenes-trabajo/ORD-ONLINE-01');
    assert.equal(resDetalleOrdenOffline.status, 200);
    assert.equal(resDetalleOrdenOffline.fromOfflineCache, true);
    assert.equal(resDetalleOrdenOffline.data.titulo, 'Latencia elevada en enlace troncal');
  });

  test('Cola de acciones (cola_acciones): Permite encolar, consultar, actualizar y eliminar mutaciones offline', async () => {
    const accion1 = await encolarAccionOffline({
      tipo: 'CERRAR_ORDEN',
      metodo: 'PATCH',
      endpoint: '/ordenes-trabajo/ORD-901/cerrar',
      payload: { diagnostico_tecnico: 'Fuente sustituida y probada', horas: 2 },
      id_usuario: 'tec-01',
    });

    const accion2 = await encolarAccionOffline({
      tipo: 'CREAR_INCIDENCIA',
      metodo: 'POST',
      endpoint: '/incidencias',
      payload: { titulo: 'Falla de UPS en Rack B', id_activo: 'ACT-100', prioridad: 'alta' },
      id_usuario: 'tec-01',
    });

    assert.ok(accion1.id);
    assert.equal(accion1.estado_sincronizacion, 'pendiente');

    const pendientes = await obtenerColaAccionesOffline('pendiente');
    assert.equal(pendientes.length, 2);
    assert.equal(pendientes[0].id, accion1.id);
    assert.equal(pendientes[1].id, accion2.id);

    const actualizada = await actualizarEstadoAccionOffline(accion1.id, 'sincronizado');
    assert.equal(actualizada.estado_sincronizacion, 'sincronizado');

    const pendientesRestantes = await obtenerColaAccionesOffline('pendiente');
    assert.equal(pendientesRestantes.length, 1);
    assert.equal(pendientesRestantes[0].id, accion2.id);

    await eliminarAccionOffline(accion1.id);
    const totalCola = await obtenerColaAccionesOffline();
    assert.equal(totalCola.length, 1);
  });

  test('Criterio 3: Limpieza segura de datos de IndexedDB y credenciales al cerrar sesión', async () => {
    globalThis.localStorage.setItem('token', 'jwt-demo-token');
    globalThis.localStorage.setItem('refreshToken', 'jwt-refresh-token');
    globalThis.localStorage.setItem('usuario', JSON.stringify({ id_usuario: 'tec-01', nombre: 'Carlos' }));

    await guardarActivosOffline([{ id: 'ACT-SEC-01', nombre: 'Servidor Confidencial' }]);
    await guardarOrdenesOffline([{ id_incidencia: 'INC-SEC-01', titulo: 'Orden Sensible' }]);
    await guardarEstadosOffline([{ id: 'est-1', nombre_estado: 'Asignada' }]);
    await encolarAccionOffline({
      tipo: 'MUTACION_PENDIENTE',
      metodo: 'POST',
      endpoint: '/incidencias',
      payload: { titulo: 'Borrador' },
    });

    // Ejecutar cierre de sesión seguro
    await limpiarSesion();

    assert.equal(globalThis.localStorage.getItem('token'), null);
    assert.equal(globalThis.localStorage.getItem('refreshToken'), null);
    assert.equal(globalThis.localStorage.getItem('usuario'), null);

    const activosTrasLogout = await obtenerActivosOffline();
    const ordenesTrasLogout = await obtenerOrdenesOffline();
    const colaTrasLogout = await obtenerColaAccionesOffline();

    assert.equal(activosTrasLogout.length, 0, 'La tienda activos debe quedar vacía al cerrar sesión');
    assert.equal(ordenesTrasLogout.length, 0, 'La tienda ordenes debe quedar vacía al cerrar sesión');
    assert.equal(colaTrasLogout.length, 0, 'La tienda cola_acciones debe quedar vacía al cerrar sesión');
  });
});
