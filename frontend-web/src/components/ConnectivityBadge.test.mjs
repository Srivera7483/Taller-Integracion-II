import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

describe('TAL-182: Componente Visual de Indicador de Estado de Conexión (ConnectivityBadge)', () => {
  const badgePath = path.join(rootDir, 'src', 'components', 'ConnectivityBadge.jsx');
  const bannerPath = path.join(rootDir, 'src', 'components', 'NetworkStatusBanner.jsx');
  const appPath = path.join(rootDir, 'src', 'App.jsx');

  // -------------------------------------------------------------------------
  // Criterio 1: Se oculta sutilmente tras 4 segundos de volver al estado online
  // -------------------------------------------------------------------------
  test('Criterio 1: Declara constante de auto-ocultado en 4000ms (4 segundos) y lógica de desvanecimiento sutil', async () => {
    assert.ok(fs.existsSync(badgePath), 'ConnectivityBadge.jsx debe existir');
    const content = fs.readFileSync(badgePath, 'utf8');

    // Debe declarar la constante exportada AUTO_HIDE_DELAY_MS = 4000
    assert.match(content, /export const AUTO_HIDE_DELAY_MS\s*=\s*4000/, 'Debe declarar AUTO_HIDE_DELAY_MS = 4000');
    assert.match(content, /export const FADE_OUT_DURATION_MS\s*=\s*500/, 'Debe declarar FADE_OUT_DURATION_MS = 500 para la transición sutil');

    // Debe contener el manejo de temporizadores con setTimeout y clearTimeout
    assert.match(content, /setTimeout\(/, 'Debe invocar setTimeout para programar el ocultado');
    assert.match(content, /clearTimeout\(/, 'Debe invocar clearTimeout para prevenir memory leaks (SonarQube)');
    assert.match(content, /isFadingOut/, 'Debe contar con estado para controlar la transición sutil de opacidad');
  });

  // -------------------------------------------------------------------------
  // Criterio 2: Permanece fijo en la parte superior cuando se pierde la conexión con botón 'Comprobar ahora'
  // -------------------------------------------------------------------------
  test('Criterio 2: Permanece fijo en la parte superior e incluye botón "Comprobar ahora"', () => {
    const content = fs.readFileSync(badgePath, 'utf8');

    // Posición fija superior
    assert.match(content, /fixed top-3.*inset-x-0.*z-50/, 'Debe utilizar posicionamiento fixed en el tope con z-50');

    // Botón con texto exacto 'Comprobar ahora'
    assert.match(content, /'Comprobar ahora'/, 'Debe incluir el botón con texto "Comprobar ahora"');

    // Manejador checkHeartbeat
    assert.match(content, /checkHeartbeat\(\)/, 'El botón debe invocar checkHeartbeat() al pulsarlo');
  });

  // -------------------------------------------------------------------------
  // Criterio 3: Totalmente responsivo en móvil y escritorio
  // -------------------------------------------------------------------------
  test('Criterio 3: Implementa clases Tailwind responsivas para móvil y escritorio', () => {
    const content = fs.readFileSync(badgePath, 'utf8');

    // Flex container no intrusivo (pointer-events-none en wrapper y pointer-events-auto en la píldora)
    assert.match(content, /pointer-events-none/, 'El wrapper debe ser pointer-events-none para no bloquear clics externos');
    assert.match(content, /pointer-events-auto/, 'La píldora debe activar pointer-events-auto');

    // Responsividad sm:
    assert.match(content, /sm:top-4/, 'Debe adaptar espaciado vertical en pantallas medianas');
    assert.match(content, /sm:gap-3/, 'Debe adaptar espaciado de elementos internos en pantallas medianas');
    assert.match(content, /rounded-full/, 'Debe tener forma de píldora (rounded-full)');
  });

  // -------------------------------------------------------------------------
  // Criterio 4: Cumplimiento de estados semánticos y reglas SonarQube (sin duplicación)
  // -------------------------------------------------------------------------
  test('Criterio 4: Implementa los 3 estados requeridos con sus colores semánticos y micro-animaciones', () => {
    const content = fs.readFileSync(badgePath, 'utf8');

    // Verde esmeralda: 'Conectado al Sistema'
    assert.match(content, /'Conectado al Sistema'/, 'Debe mostrar texto "Conectado al Sistema"');
    assert.match(content, /bg-emerald-600/, 'Debe utilizar color verde esmeralda (bg-emerald-600)');

    // Amarillo ámbar: 'Conexión inestable'
    assert.match(content, /'Conexión inestable'/, 'Debe mostrar texto "Conexión inestable"');
    assert.match(content, /bg-amber-600/, 'Debe utilizar color amarillo ámbar (bg-amber-600)');

    // Rojo carmesí: 'Sin conexión'
    assert.match(content, /'Sin conexión'/, 'Debe mostrar texto "Sin conexión"');
    assert.match(content, /bg-rose-700/, 'Debe utilizar color rojo carmesí (bg-rose-700)');

    // Micro-animación de pulso / ping
    assert.match(content, /animate-ping/, 'Debe incluir micro-animación animate-ping');
    assert.match(content, /animate-pulse/, 'Debe incluir micro-animación animate-pulse');

    // Reutilización sin código duplicado
    assert.match(content, /const StatusBeacon =/, 'Debe extraer el micro-componente de baliza para evitar duplicación');
    assert.match(content, /const ComprobarButton =/, 'Debe extraer el botón ComprobarButton para evitar duplicación');
  });

  // -------------------------------------------------------------------------
  // Integración y Retrocompatibilidad
  // -------------------------------------------------------------------------
  test('Integración: App.jsx integra ConnectivityBadge y NetworkStatusBanner provee retrocompatibilidad', () => {
    const appContent = fs.readFileSync(appPath, 'utf8');
    assert.match(appContent, /import ConnectivityBadge from '\.\/components\/ConnectivityBadge'/, 'App.jsx debe importar ConnectivityBadge');
    assert.match(appContent, /<ConnectivityBadge\s*\/>/, 'App.jsx debe montar <ConnectivityBadge />');

    const bannerContent = fs.readFileSync(bannerPath, 'utf8');
    assert.match(bannerContent, /import ConnectivityBadge from '\.\/ConnectivityBadge'/, 'NetworkStatusBanner debe importar ConnectivityBadge como retrocompatibilidad');
  });
});

