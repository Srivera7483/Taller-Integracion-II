import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TOAST_ACTION_LABEL,
  TOAST_AUTO_DISMISS_MS,
  TOAST_DEDUPE_WINDOW_MS,
  TOAST_MAX_DEDUPE_ENTRIES,
  TOAST_SOUND_STORAGE_KEY,
  construirAlertaToastDesdeWebSocket,
  esAsignacionParaTecnicoLogueado,
  esCriticidadAlta,
  esEventoToastDuplicado,
  isToastSoundEnabled,
  puedeSuscribirseASalaCoordinadores,
  reproducirSonidoDiscreto,
  resolverRutaOrdenTrabajo,
  resolverSalasSuscripcionToast,
  setToastSoundEnabled,
} from '../utils/realtimeToastAlerts.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..', '..');
const leer = (...partes) => fs.readFileSync(path.join(rootDir, ...partes), 'utf8');

const crearMemoriaStorage = () => {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
};

describe('TAL-189: Sistema de Notificaciones Toast Flotantes en Tiempo Real', () => {
  test('Descripción: integra el canal WebSocket con Toast y genera alerta con botón "Ver Orden" ante criticidad ALTA o asignación al técnico logueado', () => {
    const toastSrc = leer('src', 'components', 'Toast.jsx');
    assert.match(toastSrc, /useWebSocket/, 'Toast.jsx debe suscribirse al hook useWebSocket');
    assert.match(toastSrc, /onOrdenAsignada/, 'Debe escuchar el evento onOrdenAsignada');
    assert.match(toastSrc, /onIncidenciaActualizada/, 'Debe escuchar el evento onIncidenciaActualizada');
    assert.match(toastSrc, /onNuevaIncidencia/, 'Debe escuchar el evento onNuevaIncidencia');
    assert.equal(TOAST_ACTION_LABEL, 'Ver Orden');

    const tecnicoLogueado = {
      id_usuario: 'tec-uuid-100',
      nombre: 'Carlos',
      rol: { nombre_rol: 'TECNICO' },
      permissions: ['incidencias:ver', 'ordenes:diagnosticar'],
    };

    // 1. Asignación de orden al técnico logueado
    const alertaAsignacion = construirAlertaToastDesdeWebSocket(
      'orden_asignada',
      {
        id_orden: 'ord-550e8400',
        id_incidencia: 'inc-900',
        id_tecnico: 'tec-uuid-100',
        titulo: 'Falla de switch principal',
        nuevo_estado: 'ASIGNADA',
        tipo_evento: 'ASIGNACION_ORDEN',
      },
      tecnicoLogueado,
    );

    assert.ok(alertaAsignacion, 'Debe construir alerta para el técnico asignado');
    assert.equal(alertaAsignacion.motivo, 'ORDEN_ASIGNADA');
    assert.equal(alertaAsignacion.actionLabel, 'Ver Orden');
    assert.equal(alertaAsignacion.actionUrl, '/ordenes/ord-550e8400');
    assert.ok(alertaAsignacion.message.includes('Falla de switch principal'));

    // 2. Asignación a OTRO técnico NO debe notificar al técnico actual, NI SIQUIERA con prioridad ALTA o CRÍTICA
    const alertaOtroTecnicoBaja = construirAlertaToastDesdeWebSocket(
      'orden_asignada',
      {
        id_orden: 'ord-999',
        id_incidencia: 'inc-901',
        id_tecnico: 'tec-uuid-otro',
        prioridad: 'baja',
        tipo_evento: 'ASIGNACION_ORDEN',
      },
      tecnicoLogueado,
    );
    assert.equal(alertaOtroTecnicoBaja, null);

    const alertaOtroTecnicoAlta = construirAlertaToastDesdeWebSocket(
      'incidencia_actualizada',
      {
        id_orden: 'ord-1000',
        id_incidencia: 'inc-902',
        id_tecnico: 'tec-uuid-otro',
        usuario_responsable: 'tec-uuid-otro',
        prioridad: 'alta',
        nuevo_estado: 'ASIGNADA',
        tipo_evento: 'ASIGNACION_ORDEN',
      },
      tecnicoLogueado,
    );
    assert.equal(
      alertaOtroTecnicoAlta,
      null,
      'No debe notificar a un técnico que no es el destinatario de la asignación aunque sea de prioridad alta',
    );

    const alertaEstadoOtroTecnicoCritica = construirAlertaToastDesdeWebSocket(
      'estado_cambiado',
      {
        id_incidencia: 'inc-903',
        id_tecnico: 'tec-uuid-otro',
        prioridad: 'critica',
        nuevo_estado: 'En Progreso',
        tipo_evento: 'CAMBIO_ESTADO',
      },
      tecnicoLogueado,
    );
    assert.equal(
      alertaEstadoOtroTecnicoCritica,
      null,
      'Un técnico no debe recibir alertas de incidencias asignadas a otro técnico',
    );

    // 3. Alerta de criticidad ALTA / CRÍTICA general dispara el Toast interactivo con su ruta de entidad correspondiente
    assert.equal(esCriticidadAlta('alta'), true);
    assert.equal(esCriticidadAlta('CRÍTICA'), true);
    assert.equal(esCriticidadAlta('media'), false);
    assert.equal(esCriticidadAlta('baja'), false);

    const alertaCritica = construirAlertaToastDesdeWebSocket(
      'nueva_incidencia',
      {
        id_incidencia: 'inc-crit-777',
        titulo: 'Corte eléctrico en Data Center',
        prioridad: 'alta',
      },
      tecnicoLogueado,
    );

    assert.ok(alertaCritica, 'Debe construir alerta para incidencia de criticidad ALTA');
    assert.equal(alertaCritica.motivo, 'CRITICIDAD_ALTA');
    assert.equal(alertaCritica.type, 'critical');
    assert.equal(alertaCritica.actionLabel, 'Ver Orden');
    assert.equal(alertaCritica.actionUrl, '/incidencias/inc-crit-777');
  });

  test('Gestión de sesión y permisos de salas: solo conecta con sesión activa y restringe la sala coordinadores por permisos', () => {
    const toastSrc = leer('src', 'components', 'Toast.jsx');
    assert.match(
      toastSrc,
      /sesionActiva\s*&&\s*\(\s*<ToastRealtimeSubscriber/,
      'Toast.jsx solo debe montar la suscripción WebSocket cuando la sesión del usuario está activa',
    );
    assert.match(
      toastSrc,
      /key=\{sessionKey\}/,
      'Debe reiniciar o desmontar limpiamente la conexión WebSocket al iniciar, cambiar o cerrar sesión',
    );

    // Sin usuario no hay salas ni alertas
    assert.deepEqual(resolverSalasSuscripcionToast(null), []);
    assert.equal(
      construirAlertaToastDesdeWebSocket('nueva_incidencia', { id_incidencia: '1', prioridad: 'alta' }, null),
      null,
    );

    // Técnico o reportante sin permisos de coordinación NO se une a 'coordinadores'
    const tecnico = {
      id_usuario: 'tec-1',
      rol: { nombre_rol: 'TECNICO' },
      permissions: ['incidencias:ver', 'ordenes:diagnosticar'],
    };
    assert.equal(puedeSuscribirseASalaCoordinadores(tecnico), false);
    assert.deepEqual(resolverSalasSuscripcionToast(tecnico), ['incidencias']);

    // Supervisor / Administrador con permiso 'ordenes:asignar' SÍ se une a 'coordinadores'
    const supervisor = {
      id_usuario: 'sup-1',
      rol: { nombre_rol: 'SUPERVISOR' },
      permissions: ['ordenes:asignar', 'incidencias:clasificar_prioridad'],
    };
    assert.equal(puedeSuscribirseASalaCoordinadores(supervisor), true);
    assert.deepEqual(resolverSalasSuscripcionToast(supervisor), ['incidencias', 'coordinadores']);
  });

  test('Criterio 1: las alertas emergentes aparecen en la esquina superior derecha con sonido discreto opcional', () => {
    const toastSrc = leer('src', 'components', 'Toast.jsx');

    // Posición en esquina superior derecha
    assert.match(
      toastSrc,
      /fixed\s+top-4\s+right-4\s+z-50/,
      'El contenedor del Toast debe ubicarse en la esquina superior derecha (fixed top-4 right-4 z-50)',
    );
    assert.match(
      toastSrc,
      /id="toast-sound-toggle"/,
      'Debe incluir botón para alternar el sonido discreto opcional',
    );

    // Preferencia de sonido en localStorage
    const storage = crearMemoriaStorage();
    assert.equal(isToastSoundEnabled(storage), true, 'Por defecto el sonido opcional está activo');
    setToastSoundEnabled(false, storage);
    assert.equal(storage.getItem(TOAST_SOUND_STORAGE_KEY), 'false');
    assert.equal(isToastSoundEnabled(storage), false);
    setToastSoundEnabled(true, storage);
    assert.equal(isToastSoundEnabled(storage), true);

    // Síntesis de sonido discreto mediante Web Audio API
    let osciladorIniciado = false;
    const MockAudioContext = function () {
      this.currentTime = 0;
      this.destination = {};
      this.createOscillator = () => ({
        type: 'sine',
        frequency: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
        start: () => {
          osciladorIniciado = true;
        },
        stop: () => {},
      });
      this.createGain = () => ({
        gain: {
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
        },
        connect: () => {},
      });
      this.close = () => Promise.resolve();
    };

    const sono = reproducirSonidoDiscreto({
      enabled: true,
      audioContextFactory: MockAudioContext,
    });
    assert.equal(sono, true);
    assert.equal(osciladorIniciado, true);

    const noSono = reproducirSonidoDiscreto({
      enabled: false,
      audioContextFactory: MockAudioContext,
    });
    assert.equal(noSono, false);
  });

  test('Criterio 2: al hacer click en la alerta o en "Ver Orden", navega a la ruta correspondiente a cada entidad', () => {
    assert.equal(
      resolverRutaOrdenTrabajo({ id_orden: 'ORD-2026-01', id_incidencia: 'INC-10' }),
      '/ordenes/ORD-2026-01',
      'Si existe id_orden, debe dirigirse a /ordenes/:idOrden',
    );
    assert.equal(
      resolverRutaOrdenTrabajo({ id_incidencia: 'INC-88' }),
      '/incidencias/INC-88',
      'Si solo existe id_incidencia, debe dirigirse a /incidencias/:idIncidencia sin sustituir id_orden',
    );
    assert.equal(
      resolverRutaOrdenTrabajo({ actionUrl: '/ordenes/custom-99' }),
      '/ordenes/custom-99',
    );

    const toastSrc = leer('src', 'components', 'Toast.jsx');
    assert.match(toastSrc, /useNavigate/, 'Toast.jsx debe usar useNavigate de react-router-dom');
    assert.match(toastSrc, /navigate\(actionUrl\)/, 'Debe navegar hacia actionUrl al hacer click');
    assert.match(
      toastSrc,
      /onClick=\{esInteractivo \? handleNavegarOrden : undefined\}/,
      'Hacer click en la alerta debe disparar la navegación a la orden',
    );
    assert.match(
      toastSrc,
      /data-cy="toast-ver-orden"/,
      'Debe exponer el botón interactivo Ver Orden',
    );
  });

  test('Criterio 3: soporta cierre manual y auto-desvanecimiento tras 6 segundos (6000ms)', () => {
    assert.equal(TOAST_AUTO_DISMISS_MS, 6000, 'El tiempo de auto-desvanecimiento debe ser 6000ms (6s)');

    const contextSrc = leer('src', 'context', 'ToastContext.jsx');
    const toastSrc = leer('src', 'components', 'Toast.jsx');

    assert.match(
      contextSrc,
      /TOAST_AUTO_DISMISS_MS/,
      'ToastContext debe utilizar TOAST_AUTO_DISMISS_MS (6 segundos) por defecto',
    );
    assert.match(
      contextSrc,
      /clearTimeout\(timerRef\.current\)/,
      'ToastContext debe limpiar el temporizador al cerrar manualmente o actualizar el Toast',
    );
    assert.match(
      contextSrc,
      /hideToast/,
      'ToastContext debe exponer hideToast para el cierre manual',
    );
    assert.match(
      toastSrc,
      /data-cy="toast-close-btn"/,
      'Toast.jsx debe incluir el botón de cierre manual',
    );
    assert.match(
      toastSrc,
      /handleCerrarManual/,
      'El botón de cierre manual debe invocar handleCerrarManual deteniendo la propagación',
    );
  });

  test('Mapa de deduplicación purga entradas expiradas y acota su tamaño máximo', () => {
    const mapa = new Map();
    const t0 = 10000;

    assert.equal(esEventoToastDuplicado(mapa, 'clave-1', t0, TOAST_DEDUPE_WINDOW_MS, 3), false);
    assert.equal(esEventoToastDuplicado(mapa, 'clave-1', t0 + 500, TOAST_DEDUPE_WINDOW_MS, 3), true);

    // Pasado el TTL (2000ms), la clave-1 expira y es eliminada
    assert.equal(
      esEventoToastDuplicado(mapa, 'clave-2', t0 + TOAST_DEDUPE_WINDOW_MS + 10, TOAST_DEDUPE_WINDOW_MS, 3),
      false,
    );
    assert.equal(mapa.has('clave-1'), false, 'Debe eliminar entradas expiradas');

    // Al superar maxEntries, nunca acumula más del máximo permitido
    const mapaAcotado = new Map();
    for (let i = 0; i < TOAST_MAX_DEDUPE_ENTRIES + 20; i += 1) {
      esEventoToastDuplicado(mapaAcotado, `evento-${i}`, t0 + i);
    }
    assert.ok(
      mapaAcotado.size <= TOAST_MAX_DEDUPE_ENTRIES,
      `El tamaño del mapa (${mapaAcotado.size}) no debe exceder ${TOAST_MAX_DEDUPE_ENTRIES}`,
    );
  });

  test('Verifica coincidencia de identidad del técnico por id_usuario o correo', () => {
    const usuario = { id_usuario: 'u-42', correo: 'tecnico42@uct.cl' };
    assert.equal(
      esAsignacionParaTecnicoLogueado(
        'incidencia_actualizada',
        { tipo_evento: 'ASIGNACION_ORDEN', usuario_responsable: 'u-42' },
        usuario,
      ),
      true,
    );
    assert.equal(
      esAsignacionParaTecnicoLogueado(
        'orden_asignada',
        { correo_tecnico: 'TECNICO42@uct.cl', nuevo_estado: 'Asignada', id_tecnico: 'otro' },
        usuario,
      ),
      true,
    );
  });
});
