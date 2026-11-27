# Documentación Técnica — TAL-203: Auditoría Google Lighthouse y Optimización Web Vitals

- **Identificador de Tarea:** `TAL-203`
- **Sprint / Período:** Sprint 3 — Semana 4
- **Módulo Auditado:** `frontend-web` (`Web Admin React :5173`, compilado en modo producción con `vite build` y servido con `vite preview --port 5173`)
- **Motor de Auditoría:** Google Lighthouse `v13.6.0` sobre Chromium Headless (`msedge.exe` vía Puppeteer / CDP)
- **Estado:** ✅ Completado y Verificado (100% Criterios de Aceptación)

---

## 1. Resumen Ejecutivo y Cumplimiento de Criterios de Aceptación

Se ejecutó la auditoría real de **Google Lighthouse v13.6.0** sobre la versión compilada de producción de `frontend-web` en **Mobile** y **Desktop** cubriendo las vistas clave del sistema:

1. **Login** (`/login`, vista pública de acceso)
2. **Dashboard** (`/dashboard`, panel operativo con métricas MTTR, estadísticas de activos y suscripción en vivo)
3. **Incidencias** (`/incidencias`, catálogo operativo con filtros, tabla/tarjetas y exportación Excel)
4. **Trazabilidad** (`/trazabilidad`, ciclo de vida de activos con selector y timeline histórico)

Tras aplicar las optimizaciones de carga de recursos, división de código (`React.lazy` / `Suspense`), fragmentación de *vendors*, corrección de precaché del Service Worker (`sw.js`), SEO y accesibilidad WCAG 2.1 AA, **todas las vistas alcanzaron `100/100` en las cuatro categorías clave de Google Lighthouse (Rendimiento, Accesibilidad, Buenas Prácticas y SEO)** tanto en **Mobile** como en **Desktop**, con `LCP <= 1.2s`, `TBT <= 10ms` y `CLS <= 0.011`.

| Criterio de Aceptación (`TAL-203`) | Umbral Requerido | Resultado Verificado | Estado |
| :--- | :---: | :--- | :---: |
| **1. Puntuaciones Lighthouse y Core Web Vitals** | `> 90/100` en Accesibilidad, Buenas Prácticas y SEO; `LCP < 2.2s`; `CLS < 0.05` | **100/100** en **Rendimiento, Accesibilidad, Buenas Prácticas y SEO** en las 4 vistas (Mobile y Desktop). `LCP`: **0.3s – 1.2s**, `TBT`: **0 – 10ms**, `CLS`: **0.000 – 0.011**. | ✅ Cumple |
| **2. Preservación PWA (`TAL-170`, `TAL-196`) y `Socket.io` sin errores de consola** | SW activo + Socket.io operativo + `0` errores de consola | Service Worker `http://127.0.0.1:5173/sw.js` en estado `activated` con cachés `inframanager-precache-*` e `inframanager-assets-*`; `Socket.io` conectado (`3` sockets activos en salas `incidencias`, `coordinadores`, `rol_ADMINISTRADOR`); **`0` errores de consola** (`liveConsoleErrors: []`); `79/79` pruebas unitarias aprobadas. | ✅ Cumple |
| **3. Reporte de evidencia documentado** | Ubicado en `docs/Sprint-3/semana-4/` | Presente en `docs/Sprint-3/semana-4/TAL-203-auditoria-google-lighthouse-optimizacion-web-vitals.md` con comparativa real Antes vs. Después. | ✅ Cumple |

---

## 2. Comparativa de Resultados Reales en Google Lighthouse (Antes vs. Después)

> [!NOTE]
> **Metodología reproducible:** Para auditar el árbol DOM real y completo de las rutas protegidas sin redirecciones a `/login`, el runner de auditoría inyectó una sesión válida de `ADMINISTRADOR` en `localStorage` vía `Page.addScriptToEvaluateOnNewDocument` (CDP) junto a un responder local en `:3000` (API REST + servidor `Socket.io` real), mientras `/login` se auditó completamente sin sesión y con almacenamiento limpio.

### 2.1. Puntuaciones por Categoría (Sobre 100)

| Vista Auditada | Dispositivo | Rendimiento (Antes → Después) | Accesibilidad (Antes → Después) | Buenas Prácticas (Antes → Después) | SEO (Antes → Después) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`/login`** | Mobile | 96 → **100** (+4) | 100 → **100** | 100 → **100** | 92 → **100** (+8) |
| **`/login`** | Desktop | 100 → **100** | 100 → **100** | 100 → **100** | 92 → **100** (+8) |
| **`/dashboard`** | Mobile | 100 → **100** | 100 → **100** | 100 → **100** | 92 → **100** (+8) |
| **`/dashboard`** | Desktop | 100 → **100** | 96 → **100** (+4) | 100 → **100** | 92 → **100** (+8) |
| **`/incidencias`** | Mobile | 100 → **100** | 95 → **100** (+5) | 100 → **100** | 92 → **100** (+8) |
| **`/incidencias`** | Desktop | 100 → **100** | 96 → **100** (+4) | 100 → **100** | 92 → **100** (+8) |
| **`/trazabilidad`** | Mobile | 100 → **100** | 93 → **100** (+7) | 100 → **100** | 92 → **100** (+8) |
| **`/trazabilidad`** | Desktop | 100 → **100** | **89 ❌** → **100** (+11) | 100 → **100** | 92 → **100** (+8) |

### 2.2. Métricas Core Web Vitals (Producción Compilada)

| Vista Auditada | Dispositivo | FCP (Antes → Después) | LCP `< 2.2s` (Antes → Después) | TBT `< 200ms` (Antes → Después) | CLS `< 0.05` (Antes → Después) | Estado Web Vitals |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **`/login`** | Mobile | 1.4 s → **0.9 s** | **2.7 s ❌** → **0.9 s** (-66.7%) | 0 ms → **10 ms** | 0.000 → **0.000** | ✅ Cumple |
| **`/login`** | Desktop | 0.4 s → **0.2 s** | 0.6 s → **0.7 s** | 0 ms → **0 ms** | 0.000 → **0.000** | ✅ Cumple |
| **`/dashboard`** | Mobile | 0.8 s → **0.6 s** | 1.5 s → **1.2 s** | 10 ms → **0 ms** | 0.000 → **0.000** | ✅ Cumple |
| **`/dashboard`** | Desktop | 0.2 s → **0.2 s** | 0.4 s → **0.3 s** | 0 ms → **0 ms** | 0.011 → **0.011** | ✅ Cumple |
| **`/incidencias`** | Mobile | 0.8 s → **0.6 s** | 1.3 s → **1.1 s** | 10 ms → **0 ms** | 0.001 → **0.001** | ✅ Cumple |
| **`/incidencias`** | Desktop | 0.2 s → **0.2 s** | 0.3 s → **0.3 s** | 0 ms → **0 ms** | 0.006 → **0.005** | ✅ Cumple |
| **`/trazabilidad`** | Mobile | 0.8 s → **0.6 s** | 1.2 s → **1.0 s** | 10 ms → **0 ms** | 0.000 → **0.000** | ✅ Cumple |
| **`/trazabilidad`** | Desktop | 0.2 s → **0.2 s** | 0.4 s → **0.3 s** | 0 ms → **0 ms** | 0.000 → **0.000** | ✅ Cumple |

### 2.3. Impacto en el Bundle de Producción (`vite build`)

| Métrica de Compilación | Línea Base (Antes) | Optimizado (Después) | Mejora |
| :--- | :---: | :---: | :---: |
| **Módulos transformados** | 607 módulos | **186 módulos** | **-69.4%** |
| **Chunk principal `index-*.js` (minificado)** | 644.78 kB *(alerta `> 500 kB`)* | **114.40 kB** *(sin alertas)* | **-82.3%** |
| **Chunk principal `index-*.js` (gzip)** | 199.85 kB | **31.78 kB** | **-84.1%** |
| **Entradas en precaché inicial PWA (`sw.js`)** | 42 entradas (1,103.47 KiB, con duplicados) | **18 entradas (588.42 KiB, sin duplicados)** | **-46.7% peso** |
| **Estado del Service Worker en navegador** | `none` *(fallaba `Cache.addAll()` por duplicados)* | **`activated`** (`sw.js`) | ✅ Reparado |

---

## 3. Hallazgos de Línea Base y Optimizaciones Aplicadas

### 3.1. Rendimiento, Carga de Recursos y Core Web Vitals (`LCP`, `TBT`, `CLS`)
1. **Eliminación de bloqueo de renderizado por Google Fonts (`index.html` + `src/index.css`):**
   - *Diagnóstico:* La hoja de estilos síncrona de Google Fonts bloqueaba el primer pintado hasta **791 ms** en móvil.
   - *Solución:* Carga no bloqueante con `media="print" onload="this.media='all'"` + respaldo `<noscript>`, recortando pesos no utilizados (`400;500;600;700`) y definiendo pila tipográfica de sistema compatible en `index.css` para evitar saltos de diseño (`CLS = 0`).
2. **Retiro de `framer-motion` (~140 kB minificados) por animaciones CSS nativas (`NotificacionesDropdown.jsx` + `index.css`):**
   - *Diagnóstico:* `framer-motion` se importaba en un único componente (`NotificacionesDropdown.jsx`) únicamente para el rebote del badge y la apertura del popover, inflando el bundle inicial y el tiempo de parseo.
   - *Solución:* Se reemplazó por keyframes y transiciones CSS ligeras (`.animate-notif-badge`, `.animate-notif-dropdown`), reduciendo el total de módulos compilados de **607 a 186** sin alterar atributos `data-testid`, accesibilidad ni lógica WebSocket.
3. **División de código (`React.lazy` / `Suspense`) y fragmentación de vendors (`App.jsx`, `Layout.jsx`, `FabNuevaIncidencia.jsx`, `PWAInstallPrompt.jsx`, `vite.config.js`):**
   - Se pasó `Layout` a carga diferida con `React.lazy`, impidiendo que `/login` descargue el esqueleto autenticado, cabecera y paneles internos.
   - Se difirió bajo demanda la carga de modales y banners no visibles inicialmente: `ColaPendientesModal`, `ModalNuevaIncidenciaMobile` y `PWAInstallBanner`.
   - Se incorporó `Login` en el chunk de entrada y se retiró la opacidad `0` inicial (`fade-in-up`) de su tarjeta para evitar que la vista de inicio de sesión quedara eclipsada por un waterfall o por el banner diferido de instalación PWA, reduciendo el **LCP móvil de `/login` de `2.7s` a `0.9s`**.
   - Se configuró `build.rolldownOptions.output.codeSplitting` en `vite.config.js` en grupos `vendor-react`, `vendor-socket` y `vendor-http`, y `build.sourcemap: true` para aprobar `valid-source-maps` y eliminar el aviso de chunks mayores a `500 kB`.
4. **Estabilidad visual (`CLS`):**
   - Se añadió `min-h-[60vh]` con `role="status"` en `RouteFallback` y dimensiones explícitas `width={48} height={48} decoding="async"` en el ícono de `PWAInstallBanner.jsx`.

### 3.2. Precaché PWA (`TAL-170`, `TAL-196`) y Preservación de `Socket.io`
- **Corrección crítica detectada durante la auditoría en vivo (`src/sw.js` + `vite.config.js`):**
  - *Causa raíz:* En el build previo, la superposición entre `includeAssets` y `injectManifest.globPatterns` generaba entradas duplicadas de los 6 íconos PNG/SVG dentro de `self.__WB_MANIFEST`. Al ejecutarse `cache.addAll(urlsPrecache)` en el evento `install`, la API de Cache lanzaba `TypeError: Duplicate requests`, provocando el rechazo silencioso de la instalación del Service Worker (`swState: "none"`).
  - *Solución:* Se deduplicó `urlsPrecache` con `Array.from(new Set(...))` en `src/sw.js`, se memoizó el conjunto de rutas precacheadas para no recalcular `new URL(...)` en cada petición `fetch`, se enfocó `globPatterns` en el *App Shell* crítico (`18 entries`, `588.42 KiB`), y se agregó caché *Cache-First* bajo demanda (`inframanager-assets-*`) para los chunks con hash de `/assets/*`.
  - Se mantuvo intacto al 100% el listener `sync` de **Background Sync (`TAL-196`)** y `SKIP_WAITING`.
  - En `src/main.jsx`, se configuró `registerSW({ immediate: false })` para registrar el Service Worker tras el evento `load` sin competir con el LCP inicial.
- **Verificación de `Socket.io`:** Se comprobó en tiempo real en `/dashboard` que `Toast`, `NotificacionesDropdown` y `Dashboard` establecen sus 3 conexiones `Socket.io`, suscriben las salas `["incidencias", "coordinadores", "rol_ADMINISTRADOR"]` y operan con **`0` errores de consola**.

### 3.3. SEO (`92 → 100`)
- Se creó `frontend-web/public/robots.txt` (`User-agent: *` / `Allow: /`) evitando que el fallback SPA devolviera `index.html` con `28` errores de sintaxis en la auditoría `robots-txt`.
- Se enriqueció el `<title>` institucional en `frontend-web/index.html`.

### 3.4. Accesibilidad WCAG 2.1 AA (`89–96 → 100` en todas las vistas)
- **`Layout.jsx`:** Contraste del botón «Cerrar Sesión» elevado de `4.36:1` a `> 6.5:1` (`text-red-600` → `text-red-700`), y corrección de `label-content-name-mismatch` en `boton-cola-sincronizacion-sidebar` incluyendo el texto visible al inicio del `aria-label`.
- **`BotonExportarExcel.jsx`:** Contraste elevado de `3.65:1` a `> 5.4:1` (`bg-emerald-600` → `bg-emerald-700`), corrección de `label-content-name-mismatch` (`aria-label="Exportar a Excel — ..."`), y eliminación de un ícono `<FiChevronDown />` duplicado.
- **`Incidencias.jsx`:** Corrección de jerarquía `heading-order` (`<h3>` → `<h2>` bajo el `<h1>` del encabezado en tarjetas móviles), `aria-label` en el buscador y contraste de etiquetas de tabla (`text-gray-400` → `text-gray-600`, de `2.48:1` a `> 6.5:1`).
- **`Trazabilidad.jsx` y `TimelineActivo.jsx`:** Adición de `<label className="sr-only">` y `aria-label` en `#selector-activo-trazabilidad` (`select-name`), y corrección de `heading-order` (`<h4>` → `<h3>`).

---

## 4. Matriz de Archivos Creados y Modificados

| Archivo | Acción | Propósito |
| :--- | :---: | :--- |
| `frontend-web/public/robots.txt` | Creado | Reglas válidas de rastreo para aprobar `robots-txt` (`SEO 100/100`). |
| `frontend-web/index.html` | Modificado | Carga no bloqueante de Google Fonts y `<title>` descriptivo conservando metadatos PWA (`TAL-170`). |
| `frontend-web/src/index.css` | Modificado | Pila tipográfica compatible con `Inter` y keyframes CSS ligeros para notificaciones. |
| `frontend-web/vite.config.js` | Modificado | `codeSplitting` por vendors (`vendor-react`, `vendor-socket`, `vendor-http`), `sourcemap: true` y `globPatterns` sin duplicados para `injectManifest`. |
| `frontend-web/src/sw.js` | Modificado | Deduplicación del manifiesto de precaché, memoización de rutas y caché *Cache-First* para chunks `/assets/*` preservando `TAL-196`. |
| `frontend-web/src/main.jsx` | Modificado | Registro de SW diferido al evento `load` (`registerSW({ immediate: false })`). |
| `frontend-web/src/App.jsx` | Modificado | `Layout` con `React.lazy`, `Login` en bundle inicial para LCP inmediato y `RouteFallback` estable (`min-h-[60vh]`). |
| `frontend-web/src/Login.jsx` | Modificado | Eliminación de retraso de opacidad `0` inicial (`fade-in-up`) y uso semántico de `<h1>`. |
| `frontend-web/src/components/NotificacionesDropdown.jsx` | Modificado | Reemplazo de `framer-motion` por animaciones CSS nativas preservando `Socket.io` y `data-testid`. |
| `frontend-web/src/components/Layout.jsx` | Modificado | Carga diferida de `ColaPendientesModal`, contraste `text-red-700` y `aria-label` coherente con texto visible. |
| `frontend-web/src/components/FabNuevaIncidencia.jsx` | Modificado | Carga diferida de `ModalNuevaIncidenciaMobile` bajo demanda. |
| `frontend-web/src/components/PWAInstallPrompt.jsx` | Modificado | Carga diferida de `PWAInstallBanner` bajo demanda. |
| `frontend-web/src/components/PWAInstallBanner.jsx` | Modificado | Dimensiones explícitas `width={48} height={48}` y `decoding="async"` en imagen del ícono. |
| `frontend-web/src/components/BotonExportarExcel.jsx` | Modificado | Contraste `bg-emerald-700`, `aria-label` alineado y retiro de ícono duplicado. |
| `frontend-web/src/views/Incidencias.jsx` | Modificado | Jerarquía `<h2>`, `aria-label` en buscador y contraste `text-gray-600` en estados de tabla. |
| `frontend-web/src/views/Trazabilidad.jsx` | Modificado | `<label className="sr-only">` y `aria-label` en selector de activos (`select-name`). |
| `frontend-web/src/components/TimelineActivo.jsx` | Modificado | Jerarquía secuencial de encabezados (`<h4>` → `<h3>`). |
| `frontend-web/src/pwa.test.mjs` | Modificado | Prueba unitaria de regresión `TAL-203` para `robots.txt` y deduplicación en `sw.js`. |
| `docs/Sprint-3/semana-4/TAL-203-auditoria-google-lighthouse-optimizacion-web-vitals.md` | Creado | Reporte formal de evidencia de auditoría Lighthouse y optimizaciones Web Vitals. |

---

## 5. Verificación Automatizada Final

- **Compilación Producción (`pnpm --dir frontend-web build`):** ✅ Exitosa en `1.95s` (`dist/sw.js` generado con `18 entries`, `0` advertencias de tamaño de chunk).
- **Pruebas Unitarias (`pnpm --dir frontend-web run test:unit`):** ✅ **`79/79` pruebas aprobadas** en **`12/12` suites** (`0` fallos), incluyendo `TAL-170`, `TAL-180`, `TAL-181`, `TAL-182`, `TAL-183`, `TAL-186`, `TAL-187`, `TAL-188`, `TAL-189`, `TAL-195`, `TAL-196`, `TAL-207` y regresión `TAL-203`.
- **Análisis Estático (`pnpm --dir frontend-web run lint`):** ✅ **`0` errores** en `105` archivos analizados con `oxlint`.
- **Google Lighthouse `v13.6.0` (4 vistas × Mobile y Desktop):** ✅ **`100/100`** en Rendimiento, Accesibilidad, Buenas Prácticas y SEO; `LCP <= 1.2s`; `TBT <= 10ms`; `CLS <= 0.011`; Service Worker `activated`; `Socket.io` operativo con `0` errores de consola.
