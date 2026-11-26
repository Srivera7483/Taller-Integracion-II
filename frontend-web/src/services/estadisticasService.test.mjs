import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import api, { clearAllRetriesAndMutations, setTestRetryDelays, resetTestRetryDelays } from './api.js';
import {
  guardarActivosOffline,
  guardarOrdenesOffline,
  limpiarDatosOffline,
  createInMemoryIndexedDB,
  setIndexedDBProvider,
} from './storage/offlineDb.js';
import {
  puedeVisualizarMetricasKpis,
  puedeVerEstadisticasActivos,
  puedeVerMetricasMttr,
  normalizarEstadisticasActivos,
  normalizarMetricasTiempoResolucion,
  fetchEstadisticasActivos,
  fetchMetricasTiempoResolucion,
} from './estadisticasService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const leer = (...partes) => fs.readFileSync(path.join(rootDir, ...partes), 'utf8');

describe('TAL-207: Integración Frontend de Estadísticas de Activos (TAL-6) y Métricas MTTR (TAL-128)', () => {
  let originalAdapter;
  let originalLocalStorage;

  beforeEach(async () => {
    setIndexedDBProvider(createInMemoryIndexedDB());
    await limpiarDatosOffline();
    setTestRetryDelays([5, 5, 5]);
    originalAdapter = api.defaults.adapter;
    originalLocalStorage = globalThis.localStorage;
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

  test('Criterio 1: Consume GET /activos/estadisticas y soporta formato plano (TAL-6), snake_case (OpenAPI) y relacional (MER)', async () => {
    let urlConsultada = null;

    api.defaults.adapter = async (config) => {
      urlConsultada = config.url;
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: {
          valido: true,
          datos: {
            totalActivos: 10,
            porEstado: {
              operativos: 7,
              enMantenimiento: 1,
              enRevision: 1,
              dadosDeBaja: 1,
            },
            porCategoria: {
              COMPUTO: 5,
              AUDIOVISUAL: 3,
              REDES: 2,
            },
            porUbicacion: {
              'Edificio A - Auditorio Principal': 3,
              'Edificio A - Data Center': 2,
              'Edificio B - Laboratorio 302': 5,
            },
            porcentajes: {
              tasaOperatividad: 70,
              tasaMantenimiento: 10,
              tasaRevision: 10,
              tasaBaja: 10,
            },
            resumen: {
              disponibles: 7,
              noDisponibles: 3,
            },
          },
        },
      };
    };

    const resultado = await fetchEstadisticasActivos();

    assert.equal(urlConsultada, '/activos/estadisticas');
    assert.equal(resultado.totalActivos, 10);
    assert.equal(resultado.total_activos, 10);
    assert.equal(resultado.porcentajes.tasaOperatividad, 70);
    assert.equal(resultado.distribucionCategorias[0].etiqueta, 'Cómputo');
    assert.deepEqual(resultado.distribucionEdificios, [
      { edificio: 'Edificio A', total: 5, porcentaje: 50 },
      { edificio: 'Edificio B', total: 5, porcentaje: 50 },
    ]);

    // Verificación de compatibilidad con snake_case (OpenAPI) + arreglos relacionales del MER
    const desdeMerOpenApi = normalizarEstadisticasActivos({
      total_activos: 4,
      por_estado: { operativos: 3, en_mantenimiento: 1, en_revision: 0, dados_de_baja: 0 },
      por_categoria: [{ id_categoria: 1, nombre_categoria: 'Redes', total: 4 }],
      por_ubicacion: [
        {
          id_ubicacion: 10,
          nombre_espacio: 'Sala Core',
          edificio: { id_edificio: 2, nombre_edificio: 'Edificio Central' },
          cantidad: 4,
        },
      ],
    });
    assert.equal(desdeMerOpenApi.totalActivos, 4);
    assert.equal(desdeMerOpenApi.porEstado.enMantenimiento, 1);
    assert.equal(desdeMerOpenApi.distribucionCategorias[0].etiqueta, 'Redes');
    assert.equal(desdeMerOpenApi.distribucionEdificios[0].edificio, 'Edificio Central');
  });

  test('Criterio 2: Consume GET /estadisticas/tiempo-resolucion con fallback a /incidencias/estadisticas/tiempo-resolucion (Diagrama de Software) y soporta snake_case', async () => {
    const rutasIntentadas = [];

    api.defaults.adapter = async (config) => {
      rutasIntentadas.push(config.url);
      if (config.url === '/estadisticas/tiempo-resolucion') {
        const notFound = new Error('Not Found');
        notFound.config = config;
        notFound.response = { status: 404, data: {} };
        throw notFound;
      }
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: {
          promedio_horas_total: 14.25,
          total_ordenes_cerradas: 4,
          desglose_por_tecnico: [
            {
              id_tecnico: '8bb31e42-7890-41ab-88fe-1a2b3c4d5e6f',
              nombre_tecnico: 'María Gonzalez',
              total_ordenes_cerradas: 1,
              promedio_horas: 20,
            },
            {
              id_tecnico: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
              nombre_tecnico: 'Carlos Santana',
              total_ordenes_cerradas: 3,
              promedio_horas: 12.33,
            },
          ],
          desglose_por_activo: [
            {
              id_activo: '7cb43b02-1279-4d89-a292-6f29dfd824d5',
              nombre_activo: null,
              total_ordenes_cerradas: 2,
              promedio_horas: 10.5,
            },
          ],
          conteo_por_estado: {
            Reportada: 3,
            Asignada: 2,
            Resuelta: 4,
            Cerrada: 1,
          },
          conteo_por_prioridad: {
            baja: 2,
            media: 5,
            alta: 3,
          },
        },
      };
    };

    const metricas = await fetchMetricasTiempoResolucion();

    assert.deepEqual(rutasIntentadas, [
      '/estadisticas/tiempo-resolucion',
      '/incidencias/estadisticas/tiempo-resolucion',
    ]);
    assert.equal(metricas.promedioHorasTotal, 14.25);
    assert.equal(metricas.mttrFormateado, '14.25 h');
    assert.equal(metricas.tasaResolucion, 50);
    assert.equal(metricas.desglosePorTecnico[0].nombre_tecnico, 'Carlos Santana');
    assert.equal(metricas.desglosePorActivo[0].nombre_activo, 'Activo 7cb43b02');
  });

  test('Resiliencia de integración: Si TAL-128 aún no está fusionada (404 en ambas rutas) o el equipo está offline, sintetiza métricas respetando el MER e IndexedDB', async () => {
    // 1. Escenario donde TAL-128 aún no está en dev (404 en ambas rutas) -> calcula desde /incidencias usando HISTORIAL_ESTADOS
    api.defaults.adapter = async (config) => {
      if (config.url.includes('tiempo-resolucion')) {
        const notFound = new Error('Not Found');
        notFound.config = config;
        notFound.response = { status: 404, data: {} };
        throw notFound;
      }
      return {
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
        data: [
          {
            id_incidencia: 'inc-1',
            id_activo: 'act-1',
            nombre_activo: 'Proyector Epson',
            prioridad: 'alta',
            estado: { nombre_estado: 'Resuelta' },
            orden_trabajo: {
              id_orden: 'ord-1',
              id_tecnico: 'tec-1',
              nombre_tecnico: 'Carlos Ruiz',
              fecha_creacion: '2026-11-20T10:00:00.000Z',
            },
            historial_estados: [
              {
                estado: { nombre_estado: 'Resuelta' },
                fecha_creacion: '2026-11-20T14:30:00.000Z',
              },
            ],
          },
        ],
      };
    };

    const metricasFallback = await fetchMetricasTiempoResolucion();
    assert.equal(metricasFallback.origenDatos, 'fallback_incidencias');
    assert.equal(metricasFallback.promedioHorasTotal, 4.5);
    assert.equal(metricasFallback.tasaResolucion, 100);

    // 2. Escenario Offline PWA -> respalda desde IndexedDB (TAL-195)
    await guardarActivosOffline([
      { id: 'act-off-1', nombre: 'Switch Core', categoria: 'Redes', ubicacion: 'Edificio A - Sala 1', estado: 'Operativo' },
    ]);
    await guardarOrdenesOffline([
      {
        id_incidencia: 'inc-off-1',
        id_activo: 'act-off-1',
        prioridad: 'media',
        estado: 'Pendiente',
      },
    ]);

    api.defaults.adapter = async (config) => {
      const err = new Error('Network Error');
      err.code = 'ERR_NETWORK';
      err.config = config;
      err.request = {};
      throw err;
    };

    const activosOffline = await fetchEstadisticasActivos();
    const mttrOffline = await fetchMetricasTiempoResolucion();
    assert.equal(activosOffline.origenDatos, 'offline_indexeddb');
    assert.equal(activosOffline.totalActivos, 1);
    assert.equal(mttrOffline.origenDatos, 'offline_indexeddb');
    // Incluye inc-1 (guardada automáticamente en segundo plano al consultar /incidencias) + inc-off-1
    assert.equal(mttrOffline.totalIncidenciasGlobal, 2);
  });

  test('Criterio 3 y Diagrama de Casos de Uso: "Visualizar métricas y KPIs" es exclusivo de ADMINISTRADOR con permiso estadisticas:ver', () => {
    const mttrVacio = normalizarMetricasTiempoResolucion({
      promedioHorasTotal: 0,
      totalOrdenesCerradas: 0,
    });
    assert.equal(mttrVacio.promedioHorasTotal, 0);
    assert.equal(mttrVacio.tasaResolucion, 0);
    assert.equal(mttrVacio.sinOrdenesResueltas, true);

    // 1. TECNICO / REPORTANTE -> denegado
    globalThis.localStorage.setItem(
      'usuario',
      JSON.stringify({ rol: { nombre_rol: 'TECNICO' }, permissions: ['incidencias:ver'] }),
    );
    assert.equal(puedeVisualizarMetricasKpis(), false);
    assert.equal(puedeVerEstadisticasActivos(), false);
    assert.equal(puedeVerMetricasMttr(), false);

    // 2. SUPERVISOR -> denegado incluso si seed.cjs incluye estadisticas:ver, respetando Diagrama de Casos de Uso y TAL-128
    globalThis.localStorage.setItem(
      'usuario',
      JSON.stringify({ rol: { nombre_rol: 'SUPERVISOR' }, permissions: ['estadisticas:ver', 'ordenes:asignar'] }),
    );
    assert.equal(puedeVisualizarMetricasKpis(), false);
    assert.equal(puedeVerEstadisticasActivos(), false);
    assert.equal(puedeVerMetricasMttr(), false);

    // 3. ADMINISTRADOR sin el permiso estadisticas:ver -> denegado
    globalThis.localStorage.setItem(
      'usuario',
      JSON.stringify({ rol: { nombre_rol: 'ADMINISTRADOR' }, permissions: ['usuarios:gestionar'] }),
    );
    assert.equal(puedeVisualizarMetricasKpis(), false);

    // 4. ADMINISTRADOR con permiso estadisticas:ver -> autorizado en ambos bloques
    globalThis.localStorage.setItem(
      'usuario',
      JSON.stringify({ rol: { nombre_rol: 'ADMINISTRADOR' }, permissions: ['estadisticas:ver'] }),
    );
    assert.equal(puedeVisualizarMetricasKpis(), true);
    assert.equal(puedeVerEstadisticasActivos(), true);
    assert.equal(puedeVerMetricasMttr(), true);
  });

  test('Integración UI: Dashboard.jsx, Inventario.jsx y PanelEstadisticasAnalitica.jsx conectan carga, RBAC y refresco en tiempo real', () => {
    const panelSrc = leer('src', 'components', 'PanelEstadisticasAnalitica.jsx');
    const dashboardSrc = leer('src', 'views', 'Dashboard.jsx');
    const inventarioSrc = leer('src', 'views', 'Inventario.jsx');

    assert.ok(panelSrc.includes('fetchEstadisticasActivos'));
    assert.ok(panelSrc.includes('fetchMetricasTiempoResolucion'));
    assert.ok(panelSrc.includes('puedeVerEstadisticasActivos'));
    assert.ok(panelSrc.includes('puedeVerMetricasMttr'));
    assert.ok(dashboardSrc.includes('<PanelEstadisticasAnalitica refreshTrigger={analiticaRefreshTick} />'));
    assert.ok(inventarioSrc.includes('<PanelEstadisticasAnalitica soloActivos refreshTrigger={estadisticasRefreshTick} />'));
  });
});
