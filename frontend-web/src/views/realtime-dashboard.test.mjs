import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aplicarActualizacionIncidenciaEnVivo,
  aplicarNuevaIncidenciaEnVivo,
  sincronizarResumenMetricasEnVivo,
} from '../utils/realtimeIncidencias.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const leer = (...partes) => fs.readFileSync(path.join(rootDir, ...partes), 'utf8');

describe('TAL-187: Actualización Reactiva en Vivo del Dashboard y Tableros', () => {
  test('Descripción: Dashboard.jsx, Incidencias.jsx, Ordenes.jsx y DetalleOrden.jsx integran useWebSocket', () => {
    const dashboardSrc = leer('src', 'views', 'Dashboard.jsx');
    const incidenciasSrc = leer('src', 'views', 'Incidencias.jsx');
    const ordenesSrc = leer('src', 'views', 'Ordenes.jsx');
    const detalleOrdenSrc = leer('src', 'views', 'DetalleOrden.jsx');

    for (const [nombre, codigo] of [
      ['Dashboard.jsx', dashboardSrc],
      ['Incidencias.jsx', incidenciasSrc],
      ['Ordenes.jsx', ordenesSrc],
      ['DetalleOrden.jsx', detalleOrdenSrc],
    ]) {
      assert.ok(codigo.includes('useWebSocket'), `${nombre} debe importar e invocar useWebSocket`);
      assert.ok(
        codigo.includes('onIncidenciaActualizada'),
        `${nombre} debe suscribirse al callback onIncidenciaActualizada`,
      );
    }

    assert.ok(dashboardSrc.includes('onNuevaIncidencia'));
    assert.ok(incidenciasSrc.includes('onNuevaIncidencia'));
  });

  test('Criterio 1: Creación y cambio de estado/prioridad se aplican en memoria en menos de 500ms (< 10ms)', () => {
    const listaBase = Array.from({ length: 100 }, (_, i) => ({
      id_incidencia: `inc-${i + 1}`,
      titulo: `Incidencia #${i + 1}`,
      prioridad: 'media',
      estado: { id_estado: 1, nombre_estado: 'Reportada' },
    }));

    const t0 = performance.now();

    // 1. Creación por otro usuario
    const { lista: trasCreacion, esNueva } = aplicarNuevaIncidenciaEnVivo(listaBase, {
      id_incidencia: 'inc-nueva-999',
      titulo: 'Caída de enlace fibra óptica',
      prioridad: 'critica',
      estado: { id_estado: 1, nombre_estado: 'Reportada' },
    });

    // 2. Cambio de estado y prioridad en inc-50
    const { lista: trasCambio, itemActualizado, modificado } =
      aplicarActualizacionIncidenciaEnVivo(trasCreacion, {
        id_incidencia: 'inc-50',
        nuevo_estado: 'RESUELTA',
        prioridad: 'alta',
        usuario_responsable: 'tec-01',
        tipo_evento: 'CAMBIO_ESTADO',
      });

    const elapsedMs = performance.now() - t0;

    assert.equal(esNueva, true);
    assert.equal(trasCreacion.length, 101);
    assert.equal(trasCreacion[0].id_incidencia, 'inc-nueva-999');

    assert.equal(modificado, true);
    assert.equal(itemActualizado.estado.nombre_estado, 'Resuelta');
    assert.equal(itemActualizado.prioridad, 'alta');
    assert.equal(trasCambio.length, 101);
    assert.ok(elapsedMs < 500, `Actualización tomó ${elapsedMs.toFixed(2)}ms (debe ser < 500ms)`);
  });

  test('Criterio 2: Los contadores globales de métricas del Dashboard se actualizan en sincronía ante creaciones y cambios de estado/prioridad', () => {
    const resumenInicial = {
      total: 40,
      pendientes: 15,
      criticas: 4,
      resueltas: 20,
      cerradas: 5,
    };

    // 1. Llega una nueva incidencia crítica
    const trasNueva = sincronizarResumenMetricasEnVivo(resumenInicial, {
      tipo: 'NUEVA',
      itemNuevo: {
        id_incidencia: 'inc-41',
        prioridad: 'critica',
        estado: { nombre_estado: 'Reportada' },
      },
    });

    assert.equal(trasNueva.total, 41);
    assert.equal(trasNueva.pendientes, 16);
    assert.equal(trasNueva.criticas, 5);
    assert.equal(trasNueva.resueltas, 20);

    // 2. Esa incidencia crítica pasa de Reportada a Resuelta
    const trasResolucion = sincronizarResumenMetricasEnVivo(trasNueva, {
      tipo: 'ACTUALIZADA',
      itemAnterior: {
        id_incidencia: 'inc-41',
        prioridad: 'critica',
        estado: { nombre_estado: 'Reportada' },
      },
      itemNuevo: {
        id_incidencia: 'inc-41',
        prioridad: 'critica',
        estado: { nombre_estado: 'Resuelta' },
      },
    });

    assert.equal(trasResolucion.total, 41);
    assert.equal(trasResolucion.pendientes, 15);
    assert.equal(trasResolucion.criticas, 4);
    assert.equal(trasResolucion.resueltas, 21);

    // 3. Una incidencia pendiente cambia su prioridad de media a alta
    const trasPrioridad = sincronizarResumenMetricasEnVivo(trasResolucion, {
      tipo: 'ACTUALIZADA',
      itemAnterior: {
        id_incidencia: 'inc-10',
        prioridad: 'media',
        estado: { nombre_estado: 'Asignada' },
      },
      itemNuevo: {
        id_incidencia: 'inc-10',
        prioridad: 'alta',
        estado: { nombre_estado: 'Asignada' },
      },
    });

    assert.equal(trasPrioridad.criticas, 5);
    assert.equal(trasPrioridad.pendientes, 15);
  });

  test('Criterio 3: Cero parpadeos bruscos ni pérdida de scroll/foco (preservación de referencias y refresco silencioso)', () => {
    const fila1 = { id_incidencia: 'inc-1', titulo: 'Fila 1', estado: { nombre_estado: 'Reportada' } };
    const fila2 = { id_incidencia: 'inc-2', titulo: 'Fila 2', estado: { nombre_estado: 'Reportada' } };
    const fila3 = { id_incidencia: 'inc-3', titulo: 'Fila 3', estado: { nombre_estado: 'Reportada' } };

    const { lista } = aplicarActualizacionIncidenciaEnVivo([fila1, fila2, fila3], {
      id_incidencia: 'inc-2',
      nuevo_estado: 'ASIGNADA',
      usuario_responsable: 'tec-10',
      tipo_evento: 'ASIGNACION_ORDEN',
    });

    // Las filas no afectadas mantienen exactamente la misma referencia de objeto en memoria
    assert.strictEqual(lista[0], fila1);
    assert.strictEqual(lista[2], fila3);
    assert.notStrictEqual(lista[1], fila2);
    assert.equal(lista[1].estado.nombre_estado, 'Asignada');
    assert.equal(lista[1].id_tecnico, 'tec-10');

    // En Incidencias.jsx las actualizaciones por WebSocket usan modo silencioso ({ silent: true }) sin activar el spinner global
    const incidenciasSrc = leer('src', 'views', 'Incidencias.jsx');
    assert.ok(incidenciasSrc.includes('cargarIncidenciasReales({ silent: true })'));

    // En Dashboard.jsx las actualizaciones por WebSocket mutan setIncidencias in-place en lugar de vaciar con recargarListadoIncidencias()
    const dashboardSrc = leer('src', 'views', 'Dashboard.jsx');
    assert.ok(dashboardSrc.includes('aplicarActualizacionIncidenciaEnVivo(prev, payload)'));
    assert.ok(dashboardSrc.includes('aplicarNuevaIncidenciaEnVivo(prev, payload)'));
  });
});
