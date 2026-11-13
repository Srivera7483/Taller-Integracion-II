import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('TAL-170: Migración Inicial a PWA (Manifest y Criterios Básicos)', () => {
  const manifestPath = path.join(rootDir, 'public', 'manifest.json');
  const indexPath = path.join(rootDir, 'index.html');
  const viteConfigPath = path.join(rootDir, 'vite.config.js');

  // -------------------------------------------------------------------------
  // Criterio a: Lighthouse aprueba los criterios PWA básicos
  // -------------------------------------------------------------------------
  test('Criterio a: manifest.json existe y cuenta con la estructura fundamental de PWA', () => {
    assert.ok(fs.existsSync(manifestPath), 'public/manifest.json debe existir');

    const content = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(content);

    assert.ok(manifest.name, 'Debe incluir la propiedad "name"');
    assert.equal(manifest.name, 'InfraManager - Gestión de Infraestructura TI');

    assert.ok(manifest.short_name, 'Debe incluir la propiedad "short_name"');
    assert.equal(manifest.short_name, 'InfraManager');

    assert.ok(manifest.start_url, 'Debe incluir "start_url"');
    assert.equal(manifest.start_url, '/');

    assert.equal(manifest.display, 'standalone', 'El modo "display" debe ser "standalone" para emular app nativa');
    assert.equal(manifest.theme_color, '#003366', 'El theme_color debe coincidir con el color institucional');
    assert.equal(manifest.background_color, '#ffffff', 'Debe especificar background_color');
    assert.equal(manifest.orientation, 'portrait-primary', 'Debe especificar orientación portrait');
    assert.equal(manifest.lang, 'es', 'Debe declarar idioma en español');
  });

  test('Criterio a: manifest.json declara íconos requeridos (192x192, 512x512 y maskable)', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.ok(Array.isArray(manifest.icons), 'manifest.icons debe ser un arreglo');
    assert.ok(manifest.icons.length >= 2, 'Debe declarar al menos 2 íconos para cumplir criterios PWA');

    const icon192 = manifest.icons.find((i) => i.sizes === '192x192' && (!i.purpose || i.purpose === 'any'));
    assert.ok(icon192, 'Debe incluir ícono 192x192 para any');
    assert.equal(icon192.type, 'image/png');

    const icon512 = manifest.icons.find((i) => i.sizes === '512x512' && (!i.purpose || i.purpose === 'any'));
    assert.ok(icon512, 'Debe incluir ícono 512x512 para any');
    assert.equal(icon512.type, 'image/png');

    const iconMaskable = manifest.icons.find((i) => i.purpose === 'maskable');
    assert.ok(iconMaskable, 'Debe incluir al menos un ícono con purpose="maskable" para Android adaptive icons');
  });

  test('Criterio a: Los archivos físicos de íconos existen en public/ y son PNG válidos', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const requiredIcons = [
      'pwa-192x192.png',
      'pwa-512x512.png',
      'pwa-maskable-192x192.png',
      'pwa-maskable-512x512.png',
      'apple-touch-icon.png',
    ];

    for (const iconFile of requiredIcons) {
      const fullPath = path.join(rootDir, 'public', iconFile);
      assert.ok(fs.existsSync(fullPath), `El archivo ${iconFile} debe existir físicamente en public/`);

      const buffer = fs.readFileSync(fullPath);
      assert.ok(buffer.length > 500, `El archivo ${iconFile} debe tener un tamaño válido (> 500 bytes)`);
      assert.deepEqual(
        buffer.subarray(0, 8),
        pngHeader,
        `El archivo ${iconFile} debe tener la cabecera mágica oficial de PNG`,
      );
    }
  });

  test('Criterio a: index.html contiene todas las etiquetas meta y enlaces requeridos por Lighthouse', () => {
    assert.ok(fs.existsSync(indexPath), 'index.html debe existir');
    const html = fs.readFileSync(indexPath, 'utf8');

    assert.ok(html.includes('<link rel="manifest" href="/manifest.json"'), 'Debe enlazar el manifest');
    assert.ok(html.includes('<meta name="theme-color" content="#003366"'), 'Debe definir theme-color institucional');
    assert.ok(html.includes('<meta name="apple-mobile-web-app-capable" content="yes"'), 'Debe habilitar modo web app en iOS');
    assert.ok(html.includes('<meta name="apple-mobile-web-app-title" content="InfraManager"'), 'Debe definir título para iOS');
    assert.ok(html.includes('<link rel="apple-touch-icon" href="/apple-touch-icon.png"'), 'Debe enlazar apple-touch-icon');
    assert.ok(html.includes('name="viewport"'), 'Debe incluir viewport para responsividad');
  });

  test('Criterio a: vite.config.js integra VitePWA para Service Worker y precaching', () => {
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');

    assert.ok(viteConfig.includes("import { VitePWA } from 'vite-plugin-pwa'"), 'Debe importar VitePWA');
    assert.ok(viteConfig.includes('VitePWA({'), 'Debe configurar el plugin VitePWA');
    assert.ok(viteConfig.includes("manifestFilename: 'manifest.json'"), 'Debe configurar manifestFilename como manifest.json');
    assert.ok(viteConfig.includes("registerType: 'autoUpdate'"), 'Debe configurar autoUpdate para Service Worker');
    assert.ok(viteConfig.includes("display: 'standalone'"), 'Debe configurar display standalone en el plugin');
  });

  // -------------------------------------------------------------------------
  // Criterio b: Navegadores móviles sugieren la instalación de la App
  // -------------------------------------------------------------------------
  test('Criterio b: Componente PWAInstallPrompt existe y contempla los flujos móviles de instalación', () => {
    const componentPath = path.join(rootDir, 'src', 'components', 'PWAInstallPrompt.jsx');
    assert.ok(fs.existsSync(componentPath), 'PWAInstallPrompt.jsx debe existir en src/components/');

    const code = fs.readFileSync(componentPath, 'utf8');

    assert.ok(code.includes('beforeinstallprompt'), 'Debe capturar el evento nativo beforeinstallprompt');
    assert.ok(code.includes('appinstalled'), 'Debe escuchar el evento appinstalled');
    assert.ok(code.includes('display-mode: standalone'), 'Debe detectar si ya se encuentra instalada');
    assert.ok(code.includes('iPhone|iPad|iPod'), 'Debe incluir soporte y guía adaptativa para iOS');
    assert.ok(code.includes('btn-pwa-install'), 'Debe contener el botón interactivo de instalación');
  });

  test('Criterio b: App.jsx integra globalmente el componente PWAInstallPrompt', () => {
    const appPath = path.join(rootDir, 'src', 'App.jsx');
    const appCode = fs.readFileSync(appPath, 'utf8');

    assert.ok(appCode.includes("import PWAInstallPrompt from './components/PWAInstallPrompt'"), 'App.jsx debe importar PWAInstallPrompt');
    assert.ok(appCode.includes('<PWAInstallPrompt />'), 'App.jsx debe renderizar <PWAInstallPrompt />');
  });

  test('Criterio b: Layout.jsx integra opción de instalación de PWA en el menú', () => {
    const layoutPath = path.join(rootDir, 'src', 'components', 'Layout.jsx');
    const layoutCode = fs.readFileSync(layoutPath, 'utf8');

    assert.ok(layoutCode.includes('pwa-install-trigger'), 'Layout.jsx debe incluir disparador de instalación');
    assert.ok(layoutCode.includes('Instalar App PWA'), 'Layout.jsx debe mostrar la acción de instalar app');
  });
});

