import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  TOAST_ACTION_LABEL,
  TOAST_AUTO_DISMISS_MS,
  TOAST_SOUND_STORAGE_KEY,
  construirAlertaToastDesdeWebSocket,
  esAsignacionParaTecnicoLogueado,
  esCriticidadAlta,
  isToastSoundEnabled,
  reproducirSonidoDiscreto,
  resolverRutaOrdenTrabajo,
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

    // 2. Asignación a OTRO técnico (sin criticidad alta) no debe molestar al técnico actual
    const alertaOtroTecnico = construirAlertaToastDesdeWebSocket(
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
    assert.equal(alertaOtroTecnico, null);

    // 3. Alerta de criticidad ALTA / CRÍTICA dispara el Toast interactivo
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
    assert.equal(alertaCritica.actionUrl, '/ordenes/inc-crit-777');
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

  test('Criterio 2: al hacer click en la alerta o en "Ver Orden", navega a la orden de trabajo correspondiente', () => {
    assert.equal(
      resolverRutaOrdenTrabajo({ id_orden: 'ORD-2026-01', id_incidencia: 'INC-10' }),
      '/ordenes/ORD-2026-01',
    );
    assert.equal(
      resolverRutaOrdenTrabajo({ id_incidencia: 'INC-88' }),
      '/ordenes/INC-88',
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
