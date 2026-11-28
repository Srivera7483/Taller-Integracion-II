# TAL-204 — Auditoría y Certificación de Accesibilidad Web (WCAG 2.1 Nivel AA)

- **Ticket:** TAL-204 (`Accesibilidad Web (WCAG 2.1 AA)`)
- **Rama:** `TAL-204-Pruebas-y-Certificación-de-Accesibilidad-Web-(WCAG-2.1-AA)`
- **Aplicación auditada:** `Web Admin (React :5173)` (`frontend-web` — compilación de producción `vite build` + `vite preview`)
- **Estándar objetivo:** W3C **WCAG 2.1 Nivel AA** (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`) + buenas prácticas WAI-ARIA (`W3C APG Dialog Pattern`)
- **Herramientas de certificación:**
  - **Axe-core** (motor oficial de Axe DevTools) ejecutado sobre navegador real (Microsoft Edge Headless / Chromium) en viewports Escritorio (`1350×940`) y Móvil (`390×844`)
  - **Google Lighthouse v13.6.0** (categoría `accessibility`) en Escritorio y Móvil sobre las 11 vistas activas
  - **Verificación E2E automatizada 100% por teclado** (Puppeteer) sobre flujos PBAC, `Layout.jsx` y modales
  - **Pruebas unitarias de regresión de accesibilidad** (`frontend-web/src/accessibility.test.mjs`)

---

## 1. Resumen Ejecutivo

Se auditó y certificó la totalidad de las **11 vistas activas** de `frontend-web/src/views/` (incluyendo `Login.jsx`), el marco principal (`Layout.jsx`, `Header.jsx`, `NetworkStatusIndicator.jsx`, `NotificacionesDropdown.jsx`, `FabNuevaIncidencia.jsx`, `PWAInstallBanner.jsx`) y los **6 modales** de la aplicación.

| Criterio de Aceptación (TAL-204) | Resultado | Evidencia |
|---|---|---|
| **1. Flujo completo 100% por teclado** (autenticación, `Layout.jsx` y flujos PBAC) | **CUMPLIDO** | Login con `Tab`/`Space`/`Enter`, enlace *Saltar al contenido principal*, navegación lateral PBAC y modales con trampa de foco `Tab`/`Shift+Tab` + `Escape` + restauración de foco (`6/6` pruebas E2E aprobadas). |
| **2. Controles icónicos e indicadores con nombre accesible verificable** | **CUMPLIDO** | `aria-label`, `aria-pressed`, `aria-expanded`, `role="status"` y `aria-live="polite"` en botones icónicos, filtros, buscadores, indicadores de red (`NetworkStatusIndicator.jsx`), notificaciones y modales; íconos decorativos marcados con `aria-hidden="true"`. |
| **3. Cero violaciones críticas o serias en Axe DevTools / Lighthouse Accesibilidad** | **CUMPLIDO** | **0 violaciones críticas / 0 violaciones serias** en Axe-core WCAG 2.1 AA y **100/100 en Lighthouse Accesibilidad** en las **11 vistas** (Escritorio y Móvil) y en los modales abiertos. |

---

## 2. Hallazgos de Auditoría Inicial (Línea Base) y Correcciones Aplicadas

### 2.1 Violaciones WCAG 2.1 AA detectadas en línea base (`axe-core`)

| Vista | Viewport | Regla Axe | Impacto | Elemento detectado | Contraste Inicial | Corrección Aplicada |
|---|---|---|---|---|---|---|
| `Incidencias.jsx` (`/incidencias`) | Escritorio | `color-contrast` | **Serious** (2 nodos) | `<span class="text-[10px] text-gray-500">` sobre `bg-gray-100` (código QR del activo) | `4.39:1` (`< 4.5:1`) | Actualizado a `text-gray-700` (`> 8.5:1` sobre `bg-gray-100`). |
| `ReporteIncidencia.jsx` / `FormularioReporteIncidencia.jsx` (`/incidencias/nueva`) | Escritorio y Móvil | `color-contrast` | **Serious** (1 nodo) | `<span class="text-xs text-gray-400 font-normal">(Opcional)</span>` sobre `#ffffff` | `2.60:1` (`< 4.5:1`) | Actualizado a `text-gray-600` (`> 7.0:1`), incluyendo contador de caracteres y ayudas de campo. |
| `Usuarios.jsx` (`/usuarios`) | Escritorio | `color-contrast` | **Serious** (1 nodo) | Pie de directorio `text-gray-400` sobre `bg-gray-50/40` | `2.55:1` (`< 4.5:1`) | Actualizado a `text-gray-600` con `role="status" aria-live="polite"`. |
| `Usuarios.jsx` (`/usuarios`) | Móvil | `color-contrast` | **Serious** (4 nodos) | Etiquetas `RUT / ID` y `Fecha Registro` con `text-gray-400` sobre `bg-gray-50/80` | `2.51:1` (`< 4.5:1`) | Actualizado a `text-gray-600` (`> 6.5:1`). |

### 2.2 Brechas transversales de teclado, semántica ARIA, foco y contraste resueltas

1. **Bloqueo de teclado en `Login.jsx`:** El botón `#toggle-password-btn` tenía `tabIndex={-1}`, impidiendo a usuarios de teclado alternar la visibilidad de la contraseña. Se eliminó `tabIndex={-1}`, se agregó `aria-pressed={showPassword}`, `role="alert"` en mensajes de error/sesión expirada, `aria-live="polite"` en requisitos de contraseña y `aria-hidden="true"` en íconos decorativos.
2. **Navegación por teclado y landmarks en `Layout.jsx` y `Header.jsx`:**
   - Se incorporó el enlace de salto directo **«Saltar al contenido principal»** (`href="#contenido-principal"`, WCAG 2.4.1) apuntando a `<main id="contenido-principal" tabIndex={-1}>`.
   - Se añadió cierre por tecla `Escape` en el menú lateral móvil, `aria-expanded` y `aria-controls="sidebar-navegacion"` en `Header.jsx`, y `aria-label="Menú lateral de navegación"` en `<aside>`.
   - Se añadieron anillos de foco `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary` en todos los `NavLink` y botones del sidebar, y se corrigió el contraste de los badges pendientes (`bg-amber-700 text-white`, `> 5.0:1`).
3. **Trampa de foco y cierre accesible en modales (`useFocusTrap.js`):**
   - Se creó el hook reutilizable [`frontend-web/src/hooks/useFocusTrap.js`](../../../frontend-web/src/hooks/useFocusTrap.js) siguiendo el patrón **W3C APG Dialog**: enfoca el primer control interactivo al abrir, atrapa cíclicamente `Tab` / `Shift+Tab` dentro del modal, cierra con `Escape` y restaura el foco al botón disparador al cerrar.
   - Integrado en: `ColaPendientesModal.jsx`, `ModalCierreMantenimiento.jsx`, `ModalPrevisualizadorImagen.jsx`, `ModalNuevaIncidenciaMobile.jsx`, y los modales inline de `Inventario.jsx` (Crear/Editar y Baja) y `Usuarios.jsx` (Crear y Baja).
4. **Nombres accesibles e indicadores de estado en vivo:**
   - `NetworkStatusIndicator.jsx`: ahora declara `role="status"`, `aria-live="polite"` y `aria-label` descriptivo para sus 3 estados (En línea, Gateway inaccesible, Desconectado).
   - `NotificacionesDropdown.jsx`: soporta cierre por tecla `Escape`, `aria-haspopup="true"`, anillos `focus-visible:ring-2` en enlaces del listado y mayor contraste en badges.
   - `Mantenimientos.jsx`: se añadió `aria-label="Buscar mantenimientos por activo, código QR o ID"` al campo de búsqueda y se elevó el contraste en tarjetas móviles y celdas (`text-gray-400` → `text-gray-600`).
   - `FiltrosRangoFechasMantenimientos.jsx`: se añadió `aria-label="Quitar filtro de fechas"` al botón icónico `×`, `aria-pressed` a los atajos de fecha y `role="alert"` / `role="status"`.
   - `DetalleIncidencia.jsx`: se añadió `aria-label="Clasificar prioridad de la incidencia"` al `<select>` de prioridad.
   - `StatusFilter.jsx`, `Trazabilidad.jsx`, `AsignarTecnico.jsx`, `ModalNuevaIncidenciaMobile.jsx`: atributos `role="group"`, `aria-pressed` y `aria-expanded` en filtros y acordeones (`TimelineActivo.jsx`).
5. **Jerarquía estricta de encabezados (`h1 → h2 → h3`) y tablas accesibles:**
   - Dado que `Header.jsx` ya renderiza el `<h1>` principal de cada ruta autenticada, se ajustaron los encabezados internos duplicados (`<h1>` → `<h2>` y niveles saltados `<h4>` → `<h3>`) en `ReporteIncidencia.jsx`, `DetalleIncidencia.jsx`, `AsignarTecnico.jsx`, `Mantenimientos.jsx`, `PlanificarMantenimiento.jsx`, `Usuarios.jsx` e `Inventario.jsx`.
   - Se incorporó `aria-label="Ruta de navegación"` y `aria-current="page"` en todos los breadcrumbs `<nav>`, y `scope="col"` en los encabezados `<th>` de tablas.
   - Se eliminaron textos `text-gray-400` / `text-slate-400` sobre fondos claros en `Inventario.jsx`, `Trazabilidad.jsx`, `TimelineActivo.jsx`, `PlanificarMantenimientoForm.jsx`, `ColaPendientesModal.jsx` y `ModalNuevaIncidenciaMobile.jsx`.

---

## 3. Resultados Finales por Vista (Axe-core + Lighthouse Accesibilidad)

| # | Vista | Ruta | Axe WCAG 2.1 AA (Antes D/M) | Axe WCAG 2.1 AA (Final D/M) | Reglas Axe Aprobadas (D/M) | Lighthouse Accesibilidad (Desktop) | Lighthouse Accesibilidad (Mobile) |
|---|---|---|---|---|---|---|---|
| 1 | `Login.jsx` | `/login` | 0 / 0 *(tabIndex=-1)* | **0 / 0** | 34 / 34 | **100 / 100** | **100 / 100** |
| 2 | `Dashboard.jsx` | `/dashboard` | 0 / 0 | **0 / 0** | 44 / 44 | **100 / 100** | **100 / 100** |
| 3 | `Incidencias.jsx` | `/incidencias` | 1 ser / 0 | **0 / 0** | 47 / 43 | **100 / 100** | **100 / 100** |
| 4 | `ReporteIncidencia.jsx` | `/incidencias/nueva` | 1 ser / 1 ser | **0 / 0** | 44 / 43 | **100 / 100** | **100 / 100** |
| 5 | `DetalleIncidencia.jsx` | `/incidencias/INC-2026-0001` | 0 / 0 | **0 / 0** | 42 / 41 | **100 / 100** | **100 / 100** |
| 6 | `AsignarTecnico.jsx` | `/incidencias/asignar` | 0 / 0 | **0 / 0** | 41 / 41 | **100 / 100** | **100 / 100** |
| 7 | `Inventario.jsx` | `/inventario` | 0 / 0 *(móvil/modales)* | **0 / 0** | 47 / 43 | **100 / 100** | **100 / 100** |
| 8 | `Trazabilidad.jsx` | `/trazabilidad` | 0 / 0 | **0 / 0** | 41 / 41 | **100 / 100** | **100 / 100** |
| 9 | `Mantenimientos.jsx` | `/mantenimientos` | 0 / 0 | **0 / 0** | 47 / 42 | **100 / 100** | **100 / 100** |
| 10 | `PlanificarMantenimiento.jsx` | `/mantenimientos/planificar` | 0 / 0 | **0 / 0** | 43 / 43 | **100 / 100** | **100 / 100** |
| 11 | `Usuarios.jsx` | `/usuarios` | 1 ser / 1 ser (4 nodos) | **0 / 0** | 47 / 42 | **100 / 100** | **100 / 100** |

> **Nota sobre buenas prácticas no-WCAG (`best-practice`):** En la auditoría ampliada con etiquetas `best-practice`, `PWAInstallBanner.jsx` reporta únicamente 1 aviso `minor` (`aria-allowed-role`) y 1 `moderate` (`landmark-no-duplicate-banner`) por conservar explícitamente `<aside role="banner">` exigido por la prueba de regresión de `TAL-197` (`frontend-web/src/pwa.test.mjs`). No afecta WCAG 2.1 AA ni Lighthouse (`100/100` en las 11 vistas, `0` auditorías fallidas).

---

## 4. Evidencia de Pruebas Automatizadas (Teclado 100% + Modales + Regresión)

### 4.1 Verificación E2E 100% por teclado en navegador real (Puppeteer / Edge)

| Escenario E2E | Resultado | Detalle Verificado |
|---|---|---|
| **Login exclusivo por teclado** | **PASS** | Orden lógico `Tab`: `#email` → `#password` → `#toggle-password-btn` (`Space` cambia tipo a `text`) → `#submit-btn` (`Enter` autentica y navega a `/dashboard`). |
| **Enlace *Saltar al contenido principal* (`Layout.jsx`)** | **PASS** | Primer `Tab` enfoca `<a href="#contenido-principal">Saltar al contenido principal</a>`; `Enter` traslada el foco directamente a `<main id="contenido-principal">`. |
| **Navegación lateral PBAC por teclado (`Layout.jsx`)** | **PASS** | `Tab` recorre los ítems habilitados por PBAC en `<nav aria-label="Navegación principal">`; `Enter` sobre `Usuarios` navega a `/usuarios`. |
| **Modal «Registrar Nuevo Usuario» (`Usuarios.jsx`)** | **PASS** | Apertura por `Enter`, trampa de foco `Tab` verificada durante 15 pulsaciones sin escapar de `[role="dialog"]`, **0 violaciones Axe WCAG 2.1 AA**, cierre por `Escape` y restauración exacta del foco al botón `Nuevo Usuario`. |
| **Modal «Cola de Sincronización» (`ColaPendientesModal.jsx`)** | **PASS** | **0 violaciones Axe WCAG 2.1 AA** con modal abierto; cierre inmediato con tecla `Escape`. |
| **Modal «Registrar Nuevo Activo» (`Inventario.jsx`)** | **PASS** | Apertura por `Tab` + `Enter` sobre `Añadir Equipo`, **0 violaciones Axe WCAG 2.1 AA** con modal abierto y cierre por tecla `Escape`. |

### 4.2 Suite de pruebas unitarias, linter y build de producción

- `pnpm --dir frontend-web run lint` (`oxlint`): **0 errores** en 109 archivos.
- `pnpm --dir frontend-web run test:unit`: **85/85 pruebas aprobadas (12 suites, 0 fallos)**, incluyendo la nueva suite [`frontend-web/src/accessibility.test.mjs`](../../../frontend-web/src/accessibility.test.mjs) y preservando intactas todas las pruebas de `TAL-170`, `TAL-180`–`TAL-198`, `TAL-203` y `TAL-207`.
- `pnpm --dir frontend-web build`: build de producción y Service Worker PWA (`dist/sw.js`, 18 entradas precacheadas) generados sin errores.

---

## 5. Archivos Creados y Modificados

- **Nuevo hook accesible:** `frontend-web/src/hooks/useFocusTrap.js`
- **Nueva suite de pruebas de accesibilidad:** `frontend-web/src/accessibility.test.mjs` (integrada en `frontend-web/package.json`)
- **Layout y componentes compartidos:**
  - `frontend-web/src/components/Layout.jsx`
  - `frontend-web/src/components/Header.jsx`
  - `frontend-web/src/components/NetworkStatusIndicator.jsx`
  - `frontend-web/src/components/NotificacionesDropdown.jsx`
  - `frontend-web/src/components/FabNuevaIncidencia.jsx`
  - `frontend-web/src/components/StatusFilter.jsx`
  - `frontend-web/src/components/PWAInstallBanner.jsx`
  - `frontend-web/src/components/PanelEstadisticasAnalitica.jsx`
  - `frontend-web/src/components/TimelineActivo.jsx`
  - `frontend-web/src/components/FormularioReporteIncidencia.jsx`
  - `frontend-web/src/components/FiltrosRangoFechasMantenimientos.jsx`
  - `frontend-web/src/components/PlanificarMantenimientoForm.jsx`
  - `frontend-web/src/components/ColaPendientesModal.jsx`
  - `frontend-web/src/components/ModalCierreMantenimiento.jsx`
  - `frontend-web/src/components/ModalPrevisualizadorImagen.jsx`
  - `frontend-web/src/components/ModalNuevaIncidenciaMobile.jsx`
- **Las 11 vistas activas auditadas y corregidas:**
  - `frontend-web/src/Login.jsx`
  - `frontend-web/src/views/Dashboard.jsx`
  - `frontend-web/src/views/Incidencias.jsx`
  - `frontend-web/src/views/ReporteIncidencia.jsx`
  - `frontend-web/src/views/DetalleIncidencia.jsx`
  - `frontend-web/src/views/AsignarTecnico.jsx`
  - `frontend-web/src/views/Inventario.jsx`
  - `frontend-web/src/views/Trazabilidad.jsx`
  - `frontend-web/src/views/Mantenimientos.jsx`
  - `frontend-web/src/views/PlanificarMantenimiento.jsx`
  - `frontend-web/src/views/Usuarios.jsx`
- **Evidencia documental:** `docs/Sprint-3/semana-4/TAL-204-accesibilidad-web-wcag-2-1-aa.md`
