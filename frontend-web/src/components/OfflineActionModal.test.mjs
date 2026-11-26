import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');

describe('TAL-183: Modal Informativo y Alerta de Sincronización Diferida (OfflineActionModal)', () => {
  const modalPath = path.join(rootDir, 'src', 'components', 'OfflineActionModal.jsx');

  // -------------------------------------------------------------------------
  // Criterio 1: Diseño coherente con el sistema de diseño oscuro/claro institucional
  // -------------------------------------------------------------------------
  test('Criterio 1: Estilizado compatible con modo Claro y Oscuro según identidad visual UCT', () => {
    assert.ok(fs.existsSync(modalPath), 'OfflineActionModal.jsx debe existir');
    const content = fs.readFileSync(modalPath, 'utf8');

    // Superficie y bordes en Modo Claro
    assert.match(content, /bg-white/, 'Debe contemplar fondo blanco en modo claro');
    assert.match(content, /border-gray-200/, 'Debe utilizar bordes sutiles en modo claro');
    assert.match(content, /text-gray-900/, 'Debe utilizar tipografía de alto contraste en modo claro');

    // Superficie y bordes en Modo Oscuro (dark:)
    assert.match(content, /dark:bg-slate-900/, 'Debe contemplar fondo oscuro slate en modo oscuro');
    assert.match(content, /dark:border-slate-800/, 'Debe utilizar bordes slate en modo oscuro');
    assert.match(content, /dark:text-white|dark:text-slate-100/, 'Debe utilizar tipografía clara en modo oscuro');

    // Colores institucionales Universidad Católica de Temuco (Azul Principal y Ámbar de Alerta)
    assert.match(content, /bg-primary/, 'Debe usar el azul corporativo UCT (bg-primary) en el botón principal');
    assert.match(content, /hover:bg-primary-hover/, 'Debe aplicar hover corporativo al botón principal');
    assert.match(content, /dark:bg-primary-600/, 'Debe adaptar el botón de acción en modo oscuro');
    assert.match(content, /bg-amber-100.*dark:bg-amber-950/, 'Debe usar acentos ámbar de alerta institucional');
    assert.match(content, /text-amber-800.*dark:text-amber-300/, 'Debe asegurar contraste legible para el badge ámbar');

    // Radios unificados del sistema de diseño institucional
    assert.match(content, /rounded-xl/, 'Debe usar radio rounded-xl en el contenedor');
    assert.match(content, /rounded-lg/, 'Debe usar radio rounded-lg en botones e inputs');
  });

  // -------------------------------------------------------------------------
  // Criterio 2: Cierre accesible mediante teclado (Escape) y click exterior
  // -------------------------------------------------------------------------
  test('Criterio 2: Implementa cierre accesible con Escape, click exterior (Backdrop) y WAI-ARIA', () => {
    const content = fs.readFileSync(modalPath, 'utf8');

    // Manejo de teclado con tecla Escape
    assert.match(content, /KEY_ESCAPE\s*=\s*'Escape'|event\.key === 'Escape'/, 'Debe capturar la tecla Escape');
    assert.match(content, /window\.addEventListener\('keydown'/, 'Debe registrar listener global de teclado');
    assert.match(content, /window\.removeEventListener\('keydown'/, 'Debe remover el listener para evitar memory leaks (SonarQube)');

    // Cierre al pulsar el backdrop
    assert.match(content, /event\.target === event\.currentTarget/, 'Debe verificar click en backdrop evitando cierres por clic interno');
    assert.match(content, /onClick=\{handleBackdropClick\}/, 'Debe conectar el manejador de click exterior en el overlay');

    // WAI-ARIA Modal Accessibility
    assert.match(content, /role="alertdialog"/, 'Debe declarar role="alertdialog" por ser alerta de confirmación');
    assert.match(content, /aria-modal="true"/, 'Debe contener aria-modal="true"');
    assert.match(content, /aria-labelledby="offline-action-modal-title"/, 'Debe enlazar título accesible con aria-labelledby');
    assert.match(content, /aria-describedby="offline-action-modal-description"/, 'Debe enlazar descripción con aria-describedby');

    // Bloqueo de scroll y gestión de foco
    assert.match(content, /document\.body\.style\.overflow = 'hidden'/, 'Debe bloquear scroll de fondo mientras esté activo');
    assert.match(content, /document\.body\.style\.overflow = previousOverflow/, 'Debe restaurar el scroll del body al cerrarse');
    assert.match(content, /confirmButtonRef\.current\?\.focus\(\)/, 'Debe enfocar automáticamente el botón de confirmación');
  });

  // -------------------------------------------------------------------------
  // Criterio 3: Mensajes claros orientados a técnicos y reportantes
  // -------------------------------------------------------------------------
  test('Criterio 3: Contiene el mensaje requerido y adaptación de copy para técnicos y reportantes', () => {
    const content = fs.readFileSync(modalPath, 'utf8');

    // Frase literal estipulada en la descripción de la tarea
    assert.match(
      content,
      /Estás trabajando sin conexión\. Tu orden\/reporte se guardará localmente y se enviará de forma automática al recuperar la señal\./,
      'Debe contener exactamente el mensaje institucional base estipulado en el requerimiento'
    );

    // Tipos de acción soportados
    assert.match(content, /ACTION_TYPES\s*=\s*\{[\s\S]*ORDEN: 'orden'[\s\S]*REPORTE: 'reporte'/m, 'Debe soportar tipos de acción orden y reporte');

    // Adaptación para técnicos (órdenes de trabajo)
    assert.match(content, /Guardar Orden Sin Conexión/, 'Debe proveer título específico para órdenes de trabajo');
    assert.match(content, /diagnóstico técnico, horas y materiales/, 'Debe detallar los elementos técnicos retenidos localmente');

    // Adaptación para reportantes (incidencias)
    assert.match(content, /Guardar Reporte Sin Conexión/, 'Debe proveer título específico para reportes de incidencia');
    assert.match(content, /activo, descripción y evidencias fotográficas/, 'Debe detallar elementos del reporte retenidos');

    // Acciones de confirmar y cancelar
    assert.match(content, /Seguir editando/, 'Debe incluir opción accesible de cancelar/seguir editando');
    assert.match(content, /data-testid="offline-modal-confirm-btn"/, 'Debe exponer data-testid para el botón de confirmar');
    assert.match(content, /data-testid="offline-modal-cancel-btn"/, 'Debe exponer data-testid para el botón de cancelar');
  });

  // -------------------------------------------------------------------------
  // Buenas Prácticas SonarQube: Limpieza, Cero Magic Strings y Modularidad
  // -------------------------------------------------------------------------
  test('SonarQube Clean Code: Evita números mágicos, código duplicado y exporta constantes', () => {
    const content = fs.readFileSync(modalPath, 'utf8');

    // Constantes exportadas
    assert.match(content, /export const ACTION_TYPES/, 'Debe exportar constantes de tipos de acción');
    assert.match(content, /export const DEFAULT_OFFLINE_MESSAGE/, 'Debe exportar mensaje base por defecto');
    assert.match(content, /export const KEY_ESCAPE/, 'Debe evitar magic string de tecla Escape');

    // Micro-componentes extraídos para evitar duplicaciones (DRY)
    assert.match(content, /const ModalHeader =/, 'Debe modularizar la cabecera en micro-componente');
    assert.match(content, /const ModalFooter =/, 'Debe modularizar el pie de acciones en micro-componente');
  });
});
