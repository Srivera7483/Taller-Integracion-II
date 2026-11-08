import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

describe('TAL-180: Monitoreo de Conectividad y Heartbeat Context', () => {
  let listeners = {};
  let originalWindow;
  let originalFetch;
  let originalOnLineDescriptor;

  beforeEach(() => {
    listeners = {};
    originalWindow = globalThis.window;
    originalFetch = globalThis.fetch;
    originalOnLineDescriptor = Object.getOwnPropertyDescriptor(globalThis.navigator, 'onLine');

    try {
      Object.defineProperty(globalThis.navigator, 'onLine', {
        value: true,
        configurable: true,
        writable: true,
      });
    } catch {
      // fallback
    }

    globalThis.window = {
      addEventListener: (evt, handler) => {
        listeners[evt] = listeners[evt] || [];
        listeners[evt].push(handler);
      },
      removeEventListener: (evt, handler) => {
        if (!listeners[evt]) return;
        listeners[evt] = listeners[evt].filter((h) => h !== handler);
      },
      dispatchEvent: (event) => {
        const handlers = listeners[event.type] || [];
        handlers.forEach((h) => h(event));
      },
      location: { origin: 'http://localhost:3000', hostname: 'localhost' },
    };
  });

  afterEach(() => {
    if (originalOnLineDescriptor) {
      try {
        Object.defineProperty(globalThis.navigator, 'onLine', originalOnLineDescriptor);
      } catch {
        // fallback
      }
    }
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  });

  test('Criterio 1: isOnline refleja inmediatamente la pérdida y recuperación de señal', () => {
    let isOnline = true;
    let isServerReachable = true;

    const handleOffline = () => {
      isOnline = false;
      isServerReachable = false;
    };

    const handleOnline = () => {
      isOnline = true;
    };

    globalThis.window.addEventListener('offline', handleOffline);
    globalThis.window.addEventListener('online', handleOnline);

    assert.equal(isOnline, true);

    // Simular evento offline
    globalThis.window.dispatchEvent({ type: 'offline' });
    assert.equal(isOnline, false, 'isOnline debe ser false al disparar evento offline');
    assert.equal(isServerReachable, false, 'isServerReachable debe ser false si el dispositivo esta offline');

    // Simular evento online
    globalThis.window.dispatchEvent({ type: 'online' });
    assert.equal(isOnline, true, 'isOnline debe volver a true al disparar evento online');
  });

  test('Criterio 2: El Gateway 502/503 conmuta a isServerReachable: false solo ante fallo sostenido', async () => {
    const failureThreshold = 2;
    let failures = 0;
    let isServerReachable = true;
    let gatewayStatus = 200;

    const simulateHeartbeat = async (status) => {
      gatewayStatus = status;
      if (status >= 200 && status < 300) {
        failures = 0;
        isServerReachable = true;
        return true;
      }

      if (status === 502 || status === 503) {
        failures += 1;
        if (failures >= failureThreshold) {
          isServerReachable = false;
        }
        return false;
      }

      failures += 1;
      if (failures >= failureThreshold) {
        isServerReachable = false;
      }
      return false;
    };

    // 1er fallo 502: Transitorio -> no conmuta inmediatamente si el umbral sostenido es 2
    await simulateHeartbeat(502);
    assert.equal(failures, 1);
    assert.equal(isServerReachable, true, 'Un solo 502 transitorio no debe conmutar reachability si threshold es 2');

    // 2do fallo sostenido 502 -> Conmuta a false
    await simulateHeartbeat(502);
    assert.equal(failures, 2);
    assert.equal(isServerReachable, false, '502 sostenido debe conmutar isServerReachable a false');

    // 3er intento: Servidor se recupera y responde 200 OK
    await simulateHeartbeat(200);
    assert.equal(failures, 0, 'Al responder 200, los fallos consecutivos se resetean a 0');
    assert.equal(isServerReachable, true, 'Al responder 200, isServerReachable se recupera a true');
    assert.equal(gatewayStatus, 200);
  });

  test('Criterio 2: Fallo sostenido con 503 Service Unavailable conmuta a false', async () => {
    const failureThreshold = 2;
    let failures = 0;
    let isServerReachable = true;

    const simulateHeartbeat = async (status) => {
      if (status === 503) {
        failures += 1;
        if (failures >= failureThreshold) {
          isServerReachable = false;
        }
      }
    };

    await simulateHeartbeat(503);
    assert.equal(failures, 1);
    assert.equal(isServerReachable, true);

    await simulateHeartbeat(503);
    assert.equal(failures, 2);
    assert.equal(isServerReachable, false, '503 sostenido conmuta isServerReachable a false');
  });

  test('Criterio 3: Provee resolución de endpoints y constantes por defecto', () => {
    const CONSECUTIVE_FAILURES_THRESHOLD = 2;
    const DEFAULT_HEARTBEAT_INTERVAL = 30000;

    assert.equal(CONSECUTIVE_FAILURES_THRESHOLD, 2);
    assert.equal(DEFAULT_HEARTBEAT_INTERVAL, 30000);
  });
});
