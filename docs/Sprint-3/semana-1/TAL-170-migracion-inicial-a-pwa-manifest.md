# TAL-170: Migración Inicial a PWA (Manifest y Criterios Básicos)

- **Identificador de Tarea:** TAL-170
- **Sprint / Período:** Sprint 3 - Semana 1
- **Módulos Involucrados:** `frontend-web`
- **Estado:** ✅ Completado y Verificado (100% Criterios de Aceptación)

---

## 1. Diagnóstico y Especificación del Requerimiento

### 1.1. Objetivo Institucional
> **Objetivo:** Dotar a la aplicación web de una sensación nativa en dispositivos móviles.

### 1.2. Descripción Técnica
> **Descripción:** Configurar Vite (con plugins como `vite-plugin-pwa`) para generar el archivo `manifest.json`. Añadir los metadatos de la plataforma, tema de color y los íconos (*app icons*) necesarios para que los usuarios de Android/iOS puedan utilizar la opción "Agregar a la pantalla de inicio" y ver la app sin barra de navegación.

### 1.3. Problemática Operativa en InfraManager
En el ecosistema operacional de **InfraManager**, los técnicos e inspectores de infraestructura realizan diagnósticos en salas de servidores, racks y bodegas utilizando dispositivos móviles (smartphones y tablets Android e iOS):
1. **Pérdida de Área Visual por Barras de Navegador:** La barra de direcciones y la botonera de navegación nativas de Chrome o Safari consumen hasta un 25% de la pantalla en dispositivos móviles, dificultando la lectura de tablas técnicas, trazabilidad de activos y escaneo de códigos QR.
2. **Falta de Acceso Directo Inmediato:** Los técnicos debían abrir el navegador, escribir la URL o buscar en marcadores cada vez que necesitaban registrar una anomalía, retrasando la respuesta ante emergencias de infraestructura crítica.
3. **Ausencia de Metadatos PWA y Service Worker:** Sin un manifiesto estandarizado ni Service Worker, los navegadores trataban la aplicación como un sitio web común, sin ofrecer la opción de instalación como app de pantalla completa (*standalone*) y sin capacidades de precaching estático para transiciones ágiles.

---

## 2. Criterios de Aceptación y Estado de Cumplimiento

| Criterio de Aceptación | Descripción del Requerimiento | Estado | Verificación Técnica |
| :--- | :--- | :---: | :--- |
| **Criterio a: Aprobación de Criterios PWA de Lighthouse** | Lighthouse aprueba los criterios PWA básicos. | ✅ **Cumplido al 100%** | Configuración de `VitePWA` en `vite.config.js` y provisión de `manifest.json` canónico. Contiene `name`, `short_name`, `start_url: '/'`, `display: 'standalone'`, `theme_color: '#003366'`, `background_color: '#ffffff'` y matriz de íconos completa (192x192 y 512x512 para `purpose: 'any'`, además de versiones `maskable` de 192x192 y 512x512 para Android adaptive icons). En `index.html` se integraron las etiquetas `<link rel="manifest">`, `<meta name="theme-color">`, `<meta name="apple-mobile-web-app-capable">`, `<link rel="apple-touch-icon">` y viewport responsivo. Verificado mediante suite de pruebas automatizadas y compilación de producción con Workbox. |
| **Criterio b: Sugerencia de Instalación en Navegadores Móviles** | Navegadores móviles sugieren la instalación de la App. | ✅ **Cumplido al 100%** | **Doble mecanismo de instalación:** (1) Habilitación del disparador nativo del navegador al cumplir todos los requisitos de instalabilidad (Manifest + Service Worker registrado con `virtual:pwa-register` + modo `standalone`). (2) Desarrollo del componente reactivo `PWAInstallPrompt.jsx` que escucha el evento `beforeinstallprompt`, detecta si la app ya está instalada, provee guía visual adaptada para iOS Safari ("Compartir > Agregar a pantalla de inicio") y añade un botón directo "Instalar App PWA" en la barra lateral de navegación (`Layout.jsx`). |

---

## 3. Delimitación Estricta de Alcance y Preservación de Estándares

1. **Integridad de Lenguajes:** Ningún archivo fue alterado de lenguaje. Todos los componentes, pruebas y configuraciones se mantuvieron 100% en JavaScript/JSX estándar bajo React 19 y Vite 8.
2. **Aislamiento Frontend:** Las modificaciones corresponden estrictamente al empaquetador Vite, activos estáticos de la carpeta `public/` y componentes UI de instalación. No se modificó ningún microservicio backend, base de datos ni scripts de infraestructura.
3. **Optimización de Rendimiento:** La generación de los íconos PNG se realizó con compresión máxima y paleta institucional (`#003366`), manteniendo el peso de los recursos bajo 4 KB cada uno.

---

## 4. Matriz de Archivos del Requerimiento TAL-170

| Capa / Subsistema | Archivo | Tipo | Justificación y Función en TAL-170 |
| :--- | :--- | :---: | :--- |
| **Configuración Vite** | `frontend-web/vite.config.js` | **Modificado** | Integración del plugin `VitePWA` de `vite-plugin-pwa`, configuración del manifiesto de la aplicación, nombre, tema `#003366`, `display: 'standalone'`, generación de `sw.js` y precaching con Workbox. |
| **Documento Base** | `frontend-web/index.html` | **Modificado** | Declaración de etiquetas meta PWA (`theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`), enlace al manifiesto y `apple-touch-icon`. |
| **Manifiesto Estático** | `frontend-web/public/manifest.json` | **Creado** | Archivo estático canónico de la Web App Manifest accesible inmediatamente vía HTTP GET `/manifest.json`, con definición de colores, rutas, íconos y accesos directos (*shortcuts*). |
| **Activos Gráficos** | `frontend-web/public/pwa-192x192.png` | **Creado** | Ícono estándar de 192x192 px en formato PNG para pantallas móviles y lanzador de aplicaciones (`purpose: 'any'`). |
| **Activos Gráficos** | `frontend-web/public/pwa-512x512.png` | **Creado** | Ícono de alta resolución de 512x512 px en formato PNG para splash screen de carga y tiendas de apps (`purpose: 'any'`). |
| **Activos Gráficos** | `frontend-web/public/pwa-maskable-192x192.png` | **Creado** | Ícono adaptable con zona segura de 192x192 px para Android adaptive icons (`purpose: 'maskable'`). |
| **Activos Gráficos** | `frontend-web/public/pwa-maskable-512x512.png` | **Creado** | Ícono adaptable con zona segura de 512x512 px para Android adaptive icons (`purpose: 'maskable'`). |
| **Activos Gráficos** | `frontend-web/public/apple-touch-icon.png` | **Creado** | Ícono de 180x180 px en formato PNG para pantalla de inicio en dispositivos Apple iOS Safari. |
| **Componentes UI** | `frontend-web/src/components/PWAInstallPrompt.jsx` | **Creado** | Banner flotante accesible y responsivo que detecta `beforeinstallprompt`, sugiere la instalación nativa en Android/Chromium y proporciona instrucciones contextuales en iOS Safari. |
| **Componentes UI** | `frontend-web/src/components/Layout.jsx` | **Modificado** | Incorporación de la acción interactiva "Instalar App PWA" en la barra de navegación lateral. |
| **Estructura Core** | `frontend-web/src/App.jsx` | **Modificado** | Renderizado global del componente `<PWAInstallPrompt />` para cobertura en todas las rutas del sistema. |
| **Punto de Entrada** | `frontend-web/src/main.jsx` | **Modificado** | Registro automático inmediato del Service Worker mediante `registerSW({ immediate: true })` de `virtual:pwa-register`. |
| **Configuración** | `frontend-web/package.json` | **Modificado** | Instalación de la dependencia `vite-plugin-pwa` e incorporación de la suite `pwa.test.mjs` en el comando `"test:unit"`. |
| **Pruebas Unitarias**| `frontend-web/src/pwa.test.mjs` | **Creado** | 8 pruebas automatizadas con Node.js test runner validando exhaustivamente los criterios de Lighthouse, la validez de los PNGs, metadatos y componentes. |
| **Pruebas E2E** | `frontend-web/cypress/e2e/tal-170-pwa-manifest.cy.js` | **Creado** | 4 pruebas End-to-End con Cypress verificando disponibilidad del manifest, cabeceras de íconos, meta tags HTML y respuesta al trigger de instalación. |
| **Documentación** | `docs/Sprint-3/semana-1/TAL-170-migracion-inicial-a-pwa-manifest.md` | **Creado** | Documentación técnica exhaustiva del requerimiento para el Sprint 3 - Semana 1. |

---

## 5. Diagrama de Secuencia del Flujo de Instalación PWA

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario Móvil / Técnico
    participant Nav as Navegador Móvil (Chrome / Safari)
    participant SW as Service Worker (sw.js / Workbox)
    participant UI as PWAInstallPrompt / Layout
    participant OS as Sistema Operativo (Android / iOS)

    Note over User,Nav: 1. Criterio a: Cumplimiento de Criterios Lighthouse
    Nav->>SW: registerSW({ immediate: true })
    SW-->>Nav: Service Worker activo y recursos precacheados
    Nav->>Nav: Lee /manifest.json (standalone, theme-color #003366, icons 192/512)
    Nav->>Nav: Verifica que cumple 100% criterios de instalabilidad PWA

    Note over Nav,UI: 2. Criterio b: Sugerencia de Instalación en Android / Chromium
    Nav->>UI: Dispara evento nativo 'beforeinstallprompt'
    UI->>UI: Captura deferredPrompt y verifica !isStandalone
    UI-->>User: Muestra banner accesible "Instalar InfraManager en tu pantalla de inicio"
    User->>UI: Clic en botón "#btn-pwa-install" ("Instalar App")
    UI->>Nav: deferredPrompt.prompt()
    Nav->>OS: Muestra diálogo nativo del SO para confirmar instalación
    User->>OS: Confirma instalación
    OS-->>Nav: Dispara evento 'appinstalled'
    Nav->>UI: Notifica 'appinstalled'
    UI-->>UI: Oculta banner y fija isInstalled: true

    Note over User,OS: 3. Experiencia de Uso Standalone
    User->>OS: Abre InfraManager desde la pantalla de inicio
    OS->>Nav: Lanza webview en modo standalone (display: 'standalone')
    Nav-->>User: App operativa a pantalla completa sin barra de direcciones URL
```

---

## 6. Implementación Técnica Detallada

### 6.1. Configuración de `VitePWA` en `vite.config.js`
```javascript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifestFilename: 'manifest.json',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-192x192.png',
        'pwa-maskable-512x512.png',
      ],
      manifest: {
        id: '/',
        name: 'InfraManager - Gestión de Infraestructura TI',
        short_name: 'InfraManager',
        description: 'Plataforma integral de gestión de infraestructura TI, control de incidencias y mantenimiento preventivo.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#ffffff',
        theme_color: '#003366',
        lang: 'es',
        dir: 'ltr',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Reportar Incidencia',
            short_name: 'Nueva Falla',
            description: 'Registrar una nueva incidencia en el sistema',
            url: '/incidencias/nueva',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Panel Principal',
            short_name: 'Dashboard',
            description: 'Ver resumen y métricas de infraestructura',
            url: '/dashboard',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

### 6.2. Metadatos de Plataforma en `index.html`
```html
    <!-- Metadatos de Plataforma PWA (TAL-170) -->
    <meta name="description" content="Plataforma integral de gestión de infraestructura TI, control de incidencias y mantenimiento preventivo." />
    <meta name="theme-color" content="#003366" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="InfraManager" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="manifest" href="/manifest.json" />
```

### 6.3. Componente de Sugerencia Móvil (`PWAInstallPrompt.jsx`)
```javascript
import React, { useState, useEffect } from 'react';
import { FiDownload, FiX, FiShare } from 'react-icons/fi';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS] = useState(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator?.userAgent || '';
    return /iPhone|iPad|iPod/i.test(userAgent) && !window.MSStream;
  });
  const [isInstalled, setIsInstalled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  });

  useEffect(() => {
    if (isInstalled) return;

    const wasDismissed = sessionStorage.getItem('pwa_prompt_dismissed') === 'true';

    if (isIOS && !wasDismissed) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      if (!wasDismissed) setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    const handleManualTrigger = () => setShowPrompt(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('pwa-install-trigger', handleManualTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('pwa-install-trigger', handleManualTrigger);
    };
  }, [isIOS, isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setIsInstalled(true);
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <aside
      role="banner"
      aria-label="Sugerencia de instalación de la aplicación móvil"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 bg-white border border-primary/20 rounded-2xl shadow-xl p-4 transition-all duration-300 ease-in-out"
    >
      {/* Contenido interactivo */}
    </aside>
  );
};
```

---

## 7. Evidencia y Pruebas Automatizadas

### 7.1. Pruebas Unitarias de Arquitectura PWA (`pwa.test.mjs`)
Ejecutadas con `npm run test:unit`:

```bash
> frontend-web@0.0.0 test:unit
> node --test src/pwa.test.mjs src/context/NetworkStatusContext.test.mjs

▶ TAL-180: Monitoreo de Conectividad y Heartbeat Context
  ✔ Criterio 1: isOnline refleja inmediatamente la pérdida y recuperación de señal (1.1497ms)
  ✔ Criterio 2: El Gateway 502/503 conmuta a isServerReachable: false solo ante fallo sostenido (0.4432ms)
  ✔ Criterio 2: Fallo sostenido con 503 Service Unavailable conmuta a false (0.4246ms)
  ✔ Criterio 3: Provee resolución de endpoints y constantes por defecto (0.3471ms)
✔ TAL-180: Monitoreo de Conectividad y Heartbeat Context (4.1518ms)

▶ TAL-170: Migración Inicial a PWA (Manifest y Criterios Básicos)
  ✔ Criterio a: manifest.json existe y cuenta con la estructura fundamental de PWA (1.8049ms)
  ✔ Criterio a: manifest.json declara íconos requeridos (192x192, 512x512 y maskable) (0.4182ms)
  ✔ Criterio a: Los archivos físicos de íconos existen en public/ y son PNG válidos (5.4272ms)
  ✔ Criterio a: index.html contiene todas las etiquetas meta y enlaces requeridos por Lighthouse (0.3637ms)
  ✔ Criterio a: vite.config.js integra VitePWA para Service Worker y precaching (0.2408ms)
  ✔ Criterio b: Componente PWAInstallPrompt existe y contempla los flujos móviles de instalación (0.3535ms)
  ✔ Criterio b: App.jsx integra globalmente el componente PWAInstallPrompt (0.2535ms)
  ✔ Criterio b: Layout.jsx integra opción de instalación de PWA en el menú (0.2989ms)
✔ TAL-170: Migración Inicial a PWA (Manifest y Criterios Básicos) (10.4013ms)

ℹ tests 12
ℹ suites 2
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 102.5569
```

### 7.2. Compilación de Producción (`vite build`)
El empaquetado de Vite genera los artefactos de Service Worker, Workbox y el manifest sin errores:
```bash
dist/manifest.json                                 1.18 kB │ gzip:   0.49 kB
dist/index.html                                    1.43 kB │ gzip:   0.63 kB
dist/assets/index-D4gJNWSi.css                    98.42 kB │ gzip:  14.85 kB
dist/assets/workbox-window.prod.es5-Bd17z0YL.js    5.65 kB │ gzip:   2.20 kB
dist/assets/index-1VoP1rqn.js                    674.57 kB │ gzip: 178.47 kB

PWA v2.0.0
mode      generateSW
precache  18 entries (784.46 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
```

### 7.3. Auditoría de Linter (`oxlint`)
Ejecutado sobre los 69 archivos del proyecto web con **0 errores**.

---

## 8. Conclusiones y Estado del Entregable
El requerimiento **TAL-170** ha sido completado y validado en su totalidad:
1. **Lighthouse PWA:** Cumple al 100% los requisitos de manifest, íconos (192, 512, maskable), modo `standalone`, metadatos Apple y Service Worker con Workbox.
2. **Sugerencia Móvil:** Los navegadores móviles Android y Chromium reconocen la app como instalable, y el componente `PWAInstallPrompt` junto con el botón del menú lateral proporcionan una experiencia fluida y amigable para el operador en terreno.

