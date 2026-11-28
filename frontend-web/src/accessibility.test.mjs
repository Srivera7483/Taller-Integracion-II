import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const readSrc = (rel) => fs.readFileSync(path.join(__dirname, rel), 'utf8');

test('TAL-204 (WCAG 2.1 AA): Layout implementa skip-to-content, cierre por Escape y anillos focus-visible:ring-2', () => {
  const layout = readSrc('components/Layout.jsx');
  assert.match(layout, /href="#contenido-principal"/, 'Layout debe proveer enlace de salto al contenido principal');
  assert.match(layout, /id="contenido-principal"/, '<main> debe tener id="contenido-principal"');
  assert.match(layout, /event\.key === 'Escape'/, 'El menú móvil en Layout debe cerrarse con tecla Escape');
  assert.match(layout, /aria-label="Navegación principal"/, 'El landmark <nav> debe tener aria-label');
  assert.match(layout, /focus-visible:ring-2/, 'Los controles de Layout deben mostrar anillo focus-visible:ring-2');
});

test('TAL-204 (WCAG 2.1 AA): Header y NetworkStatusIndicator exponen roles y nombres accesibles', () => {
  const header = readSrc('components/Header.jsx');
  const net = readSrc('components/NetworkStatusIndicator.jsx');
  assert.match(header, /aria-expanded=\{isMobileMenuOpen\}/, 'El botón menú móvil debe exponer aria-expanded');
  assert.match(header, /aria-label="Abrir menú de navegación"/, 'El botón menú móvil debe tener aria-label');
  assert.match(net, /role="status"/, 'NetworkStatusIndicator debe declarar role="status"');
  assert.match(net, /aria-live="polite"/, 'NetworkStatusIndicator debe anunciar cambios con aria-live="polite"');
  assert.match(net, /aria-label=/, 'NetworkStatusIndicator debe tener nombre accesible explícito');
});

test('TAL-204 (WCAG 2.1 AA): Login permite navegación 100% por teclado sin tabIndex={-1} en botones interactivos', () => {
  const login = readSrc('Login.jsx');
  assert.doesNotMatch(
    login,
    /id="toggle-password-btn"[\s\S]{0,120}tabIndex=\{-1\}/,
    'El botón de mostrar/ocultar contraseña no debe tener tabIndex={-1}'
  );
  assert.match(login, /aria-pressed=\{showPassword\}/, 'El toggle de contraseña debe exponer aria-pressed');
  assert.match(login, /role="alert"/, 'Los avisos de validación/expiración en Login deben usar role="alert"');
});

test('TAL-204 (WCAG 2.1 AA): useFocusTrap implementa trampa de foco Tab/Shift+Tab, Escape y restauración de foco', () => {
  const hook = readSrc('hooks/useFocusTrap.js');
  assert.match(hook, /event\.key === 'Escape'/, 'useFocusTrap debe manejar Escape');
  assert.match(hook, /event\.key !== 'Tab'/, 'useFocusTrap debe atrapar Tab/Shift+Tab');
  assert.match(hook, /previousFocusRef/, 'useFocusTrap debe restaurar el foco al cerrar');

  const modalesConTrampa = [
    'components/ColaPendientesModal.jsx',
    'components/ModalCierreMantenimiento.jsx',
    'components/ModalPrevisualizadorImagen.jsx',
    'components/ModalNuevaIncidenciaMobile.jsx',
    'views/Inventario.jsx',
    'views/Usuarios.jsx',
  ];
  for (const rel of modalesConTrampa) {
    const src = readSrc(rel);
    assert.match(src, /useFocusTrap/, `${rel} debe integrar useFocusTrap`);
    assert.match(src, /role="dialog"/, `${rel} debe declarar role="dialog"`);
    assert.match(src, /aria-modal="true"/, `${rel} debe declarar aria-modal="true"`);
  }
});

test('TAL-204 (WCAG 2.1 AA): Las 11 vistas activas respetan jerarquía de encabezados, ARIA y contraste >= 4.5:1', () => {
  const vistas = [
    'views/Dashboard.jsx',
    'views/Incidencias.jsx',
    'views/ReporteIncidencia.jsx',
    'views/DetalleIncidencia.jsx',
    'views/AsignarTecnico.jsx',
    'views/Inventario.jsx',
    'views/Trazabilidad.jsx',
    'views/Mantenimientos.jsx',
    'views/PlanificarMantenimiento.jsx',
    'views/Usuarios.jsx',
  ];

  for (const rel of vistas) {
    const src = readSrc(rel);
    assert.doesNotMatch(
      src,
      /<h1\b/,
      `${rel} no debe renderizar un segundo <h1> (Header.jsx ya renderiza el <h1> de la vista)`
    );
    assert.match(src, /focus-visible:ring-2/, `${rel} debe aplicar focus-visible:ring-2 en controles interactivos`);
  }

  // Verificar ausencia de clases de bajo contraste previamente detectadas por Axe
  const incidencias = readSrc('views/Incidencias.jsx');
  assert.doesNotMatch(incidencias, /text-\[10px\] text-gray-500/, 'Incidencias.jsx no debe usar text-gray-500 sobre bg-gray-100');

  const formReporte = readSrc('components/FormularioReporteIncidencia.jsx');
  assert.doesNotMatch(formReporte, /text-xs text-gray-400 font-normal">\(Opcional\)/, 'FormularioReporteIncidencia no debe usar text-gray-400 en texto (Opcional)');

  const usuarios = readSrc('views/Usuarios.jsx');
  assert.doesNotMatch(usuarios, /text-gray-400 font-medium bg-gray-50\/40/, 'Usuarios.jsx no debe usar text-gray-400 en el pie de directorio');
  assert.doesNotMatch(usuarios, /text-gray-400 block text-\[10px\] uppercase font-bold/, 'Usuarios.jsx no debe usar text-gray-400 en tarjetas móviles');

  const mantenimientos = readSrc('views/Mantenimientos.jsx');
  assert.match(mantenimientos, /aria-label="Buscar mantenimientos/, 'El buscador de Mantenimientos.jsx debe tener aria-label');
});
