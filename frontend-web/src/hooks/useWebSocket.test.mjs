import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveWebSocketUrl,
  resolveSocketAuthContext,
  calcularRetrasoReconexion,
  despacharEventoTipado,
  normalizarSolicitudSala,
  WS_EVENTS,
  WS_DEFAULT_BASE_DELAY_MS,
  WS_DEFAULT_MAX_DELAY_MS,
} from './useWebSocket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const hookPath = path.resolve(__dirname, 'useWebSocket.js');
const hookSource = fs.readFileSync(hookPath, 'utf8');

describe('TAL-186: Hook Personalizado useWebSocket y Gestión de Salas en React', () => {
  test('Descripción: Resuelve la URL del servidor WebSocket eliminando sufijos /api/v1 y /api', () => {
    assert.equal(resolveWebSocketUrl('http://localhost:3000/api/v1'), 'http://localhost:3000');
    assert.equal(resolveWebSocketUrl('http://localhost:3000/api/'), 'http://localhost:3000');
    assert.equal(resolveWebSocketUrl('https://scgi.uct.cl/api/v1/'), 'https://scgi.uct.cl');
  });

  test('Descripción: Extrae automáticamente el token JWT, rol y userId desde el almacenamiento de sesión', () => {
    const mockStorage = new Map([
      ['token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'],
      [
        'usuario',
        JSON.stringify({
          id_usuario: 'usr-001',
          nombre: 'Benjamín Soto',
          rol: { nombre_rol: 'Supervisor' },
        }),
      ],
    ]);

    const ctx = resolveSocketAuthContext({
      getItem: (key) => mockStorage.get(key) ?? null,
    });

    assert.equal(ctx.token, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test');
    assert.equal(ctx.userId, 'usr-001');
    assert.equal(ctx.rol, 'SUPERVISOR');
  });

  test('Criterio 1: Conecta automáticamente al montar, inyecta JWT y ejecuta desconexión limpia al desmontar (removeAllListeners + disconnect)', () => {
    assert.ok(hookSource.includes('autoConnect = true'), 'Debe conectar automáticamente por defecto');
    assert.ok(hookSource.includes('Bearer ${token}'), 'Debe enviar automáticamente el token JWT en el handshake');
    assert.ok(
      hookSource.includes('socketRef.current.removeAllListeners?.()'),
      'Debe limpiar todos los listeners al desmontar para evitar fugas de memoria',
    );
    assert.ok(
      hookSource.includes('socketRef.current.disconnect?.()'),
      'Debe desconectar el socket limpiamente al desmontar el componente',
    );
    assert.ok(
      hookSource.includes("reason !== 'io client disconnect'"),
      'No debe disparar reconexión tras una desconexión manual o al desmontar',
    );
  });

  test('Criterio 2: Aplica backoff exponencial con jitter acotado en caso de cierre accidental', () => {
    // Sin jitter (randomFn = 0.5 -> offset 0): 1000ms, 2000ms, 4000ms, 8000ms, 16000ms, 30000ms (tope)
    const sinJitter = (attempt) =>
      calcularRetrasoReconexion(attempt, {
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        jitterFactor: 0.3,
        randomFn: () => 0.5,
      });

    assert.equal(sinJitter(0), 1000);
    assert.equal(sinJitter(1), 2000);
    assert.equal(sinJitter(2), 4000);
    assert.equal(sinJitter(3), 8000);
    assert.equal(sinJitter(4), 16000);
    assert.equal(sinJitter(5), 30000);

    // Con jitter positivo (randomFn = 1.0 -> +30%) en attempt 2 (4000ms + 1200ms = 5200ms)
    const conJitterMax = calcularRetrasoReconexion(2, {
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      jitterFactor: 0.3,
      randomFn: () => 1.0,
    });
    assert.equal(conJitterMax, 5200);

    // Con jitter negativo (randomFn = 0.0 -> -30%) en attempt 2 (4000ms - 1200ms = 2800ms)
    const conJitterMin = calcularRetrasoReconexion(2, {
      baseDelayMs: 1000,
      maxDelayMs: 30000,
      jitterFactor: 0.3,
      randomFn: () => 0.0,
    });
    assert.equal(conJitterMin, 2800);

    // Nunca baja de baseDelayMs ni supera maxDelayMs
    assert.ok(conJitterMin >= WS_DEFAULT_BASE_DELAY_MS);
    assert.ok(conJitterMax <= WS_DEFAULT_MAX_DELAY_MS);
  });

  test('Criterio 3: Despacha con tipado claro los callbacks para orden_asignada y estado_cambiado (incluyendo discriminación desde incidencia_actualizada de TAL-185)', () => {
    const recibidosOrden = [];
    const recibidosEstado = [];
    const recibidosGeneral = [];
    const recibidosNueva = [];

    const callbacks = {
      onOrdenAsignada: (p) => recibidosOrden.push(p),
      onEstadoCambiado: (p) => recibidosEstado.push(p),
      onIncidenciaActualizada: (p) => recibidosGeneral.push(p),
      onNuevaIncidencia: (p) => recibidosNueva.push(p),
    };

    // 1. Evento incidencia_actualizada con tipo_evento = 'ASIGNACION_ORDEN' (emitido por OrdenesTrabajoService en TAL-185)
    const resOrden = despacharEventoTipado(
      WS_EVENTS.INCIDENCIA_ACTUALIZADA,
      {
        id_incidencia: 'inc-101',
        nuevo_estado: 'ASIGNADA',
        usuario_responsable: 'tec-55',
        id_edificio: 'ED-A',
        tipo_evento: 'ASIGNACION_ORDEN',
      },
      callbacks,
    );

    assert.equal(resOrden.tipoNormalizado, WS_EVENTS.ORDEN_ASIGNADA);
    assert.equal(recibidosOrden.length, 1);
    assert.equal(recibidosOrden[0].id_incidencia, 'inc-101');
    assert.equal(recibidosOrden[0].usuario_responsable, 'tec-55');
    assert.equal(recibidosOrden[0].tipo_evento, 'ASIGNACION_ORDEN');
    assert.equal(recibidosGeneral.length, 1);

    // 2. Evento incidencia_actualizada con tipo_evento = 'CAMBIO_ESTADO' (emitido por IncidenciasService en TAL-185)
    const resEstado = despacharEventoTipado(
      WS_EVENTS.INCIDENCIA_ACTUALIZADA,
      {
        id_incidencia: 'inc-101',
        nuevo_estado: 'RESUELTA',
        usuario_responsable: 'tec-55',
        tipo_evento: 'CAMBIO_ESTADO',
      },
      callbacks,
    );

    assert.equal(resEstado.tipoNormalizado, WS_EVENTS.INCIDENCIA_ACTUALIZADA);
    assert.equal(recibidosEstado.length, 1);
    assert.equal(recibidosEstado[0].nuevo_estado, 'RESUELTA');
    assert.equal(recibidosEstado[0].tipo_evento, 'CAMBIO_ESTADO');
    assert.equal(recibidosGeneral.length, 2);

    // 3. Eventos directos orden_asignada, estado_cambiado y nueva_incidencia
    despacharEventoTipado(
      WS_EVENTS.ORDEN_ASIGNADA,
      { id_incidencia: 'inc-202', id_tecnico: 'tec-99' },
      callbacks,
    );
    assert.equal(recibidosOrden.length, 2);
    assert.equal(recibidosOrden[1].usuario_responsable, 'tec-99');

    despacharEventoTipado(
      WS_EVENTS.ESTADO_CAMBIADO,
      { id_incidencia: 'inc-202', nuevo_estado: 'Cerrada' },
      callbacks,
    );
    assert.equal(recibidosEstado.length, 2);
    assert.equal(recibidosEstado[1].nuevo_estado, 'Cerrada');

    despacharEventoTipado(
      WS_EVENTS.NUEVA_INCIDENCIA_LEGACY,
      { id: 'inc-303', titulo: 'Falla en switch principal' },
      callbacks,
    );
    assert.equal(recibidosNueva.length, 1);
    assert.equal(recibidosNueva[0].titulo, 'Falla en switch principal');
  });

  test('Descripción: Normaliza suscripciones a salas (unirse_sala / dejar_sala) por nombre, edificio, incidencia y rol', () => {
    const porString = normalizarSolicitudSala('edificio_B');
    assert.deepEqual(porString.nombresSalas, ['edificio_B']);

    const porObjeto = normalizarSolicitudSala({
      id_incidencia: 'abc-123',
      id_edificio: 'CT-1',
      rol: 'SUPERVISOR',
    });
    assert.ok(porObjeto.nombresSalas.includes('incidencia_abc-123'));
    assert.ok(porObjeto.nombresSalas.includes('edificio_CT-1'));
    assert.ok(porObjeto.nombresSalas.includes('rol_SUPERVISOR'));
    assert.ok(porObjeto.nombresSalas.includes('coordinadores'));

    assert.ok(hookSource.includes('unirse_sala: unirseSala'));
    assert.ok(hookSource.includes('dejar_sala: dejarSala'));
    assert.ok(hookSource.includes('ultimoEvento'));
    assert.ok(hookSource.includes('ultimosEventos'));
  });
});
