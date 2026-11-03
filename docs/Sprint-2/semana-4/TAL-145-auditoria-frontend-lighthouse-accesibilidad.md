# TAL-145: Auditoría Frontend (Lighthouse) de Accesibilidad

## 1. Resumen Ejecutivo y Estado Actual (Criterio `> 90%` Cumplido al 100%)

Se ejecutó la auditoría real utilizando **Google Lighthouse v13.6.0** sobre navegador Chromium (`Brave/Chrome Headless` vía protocolo CDP) contra el servidor de desarrollo activo (`http://localhost:5173`) en las vistas principales del sistema:
1. **Login** (`/login`)
2. **Dashboard** (`/dashboard`)
3. **Detalle** — evaluado y corregido en sus dos variantes de negocio dentro de la plataforma:
   - **Detalle de Incidencia** (`/incidencias/INC-1042`)
   - **Detalle de Orden de Trabajo** (`/ordenes/ORD-1042`)

Tras aplicar todas las correcciones de accesibilidad en el código fuente, **todas las vistas pasaron de tener puntajes iniciales bajo el 90% en móvil (88% y 87%) a obtener un 100% real en Google Lighthouse**, tanto en **Mobile** como en **Desktop**.

### Tabla de Puntajes Reales en Lighthouse (Estado Actual vs. Línea Base Inicial)

| Vista Auditada | Ruta | Puntaje Actual (Mobile) | Puntaje Actual (Desktop) | Estado Criterio (`> 90%`) | Puntaje Antes de Cambios (Mobile / Desktop) |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **1. Login** | `/login` | ✅ **100%** | ✅ **100%** | ✅ **Cumplido (`100% > 90%`)** | 100% / 100% |
| **2. Dashboard** | `/dashboard` | ✅ **100%** | ✅ **100%** | ✅ **Cumplido (`100% > 90%`)** | 94% / 96% *(tenía 1 fallo)* |
| **3. Detalle (Incidencia)** | `/incidencias/INC-1042` | ✅ **100%** | ✅ **100%** | ✅ **Cumplido (`100% > 90%`)** | **88%** ❌ / 94% *(subió +12 pts)* |
| **4. Detalle (Orden)** | `/ordenes/ORD-1042` | ✅ **100%** | ✅ **100%** | ✅ **Cumplido (`100% > 90%`)** | **87%** ❌ / 94% *(subió +13 pts)* |

> [!IMPORTANT]
> **Metodología sin datos inventados:** Para evitar que las rutas protegidas (`ProtectedRoute`) redirigieran silenciosamente a `/login` durante la prueba automatizada, el runner de Lighthouse inyectó previamente vía Chrome DevTools Protocol (`Page.addScriptToEvaluateOnNewDocument`) una sesión autenticada válida en `localStorage` (`token`, `rol_activo: SUPERVISOR` y `user_data`). De esta forma, Lighthouse auditó el árbol DOM real y completo de cada vista tanto en **Mobile** (`Moto G Power emulation`) como en **Desktop** (`1350x940`).

---

## 2. Diagnóstico de Línea Base: ¿En qué NO se había pasado antes de los cambios, por qué salía `< 90%` y qué cambios se aplicaron para subir al 100%?

En la primera medición (*Antes de los cambios*), las vistas de **Detalle de Incidencia (88% en Mobile)** y **Detalle de Orden (87% en Mobile)** **habían salido por debajo del 90%**, y **Dashboard (94% Mobile / 96% Desktop)** presentaba errores puntuales.

A continuación se documenta exactamente **por qué fallaban en la medición inicial** y **los cambios que ya fueron aplicados en el código** para subir todas las vistas al **100%**:

### 2.1. Fallo Inicial 1: `button-name` (Peso en Lighthouse: `weight = 10`) — ✅ CORREGIDO
- **Vistas donde fallaba antes:** Dashboard (Mobile: 94%), Detalle de Incidencia (Mobile: 88%) y Detalle de Orden (Mobile: 87%).
- **Por qué no pasaba antes:**
  En `frontend-web/src/components/Layout.jsx`, los dos botones del menú lateral responsivo (el botón `<FiMenu />` para abrir el menú en móvil y el botón `<FiX />` para cerrarlo dentro del drawer) contenían únicamente un ícono SVG sin texto interno ni atributo `aria-label`. Además, en `frontend-web/src/views/DetalleIncidencia.jsx`, el botón flotante de ampliación (`<FiMaximize2 />`) sobre la miniatura de evidencia de Cloudinary tenía atributo `title`, pero carecía de `aria-label` explícito.
  - **Selectores exactos reportados por Lighthouse en el baseline:**
    - `div.min-h-screen > aside.fixed > div.h-16 > button.lg:hidden` (`<button class="lg:hidden text-gray-500 hover:text-gray-700">`)
    - `div.flex-1 > header.h-16 > div.flex > button.lg:hidden` (`<button class="lg:hidden text-gray-500 hover:text-gray-700 p-1">`)
- **Cambio aplicado en el código (Resuelto):**
  Se agregaron `type="button"`, `aria-label="Abrir menú de navegación"`, `aria-label="Cerrar menú lateral"` y `aria-hidden="true"` a los íconos decorativos en `Layout.jsx`, así como `aria-label` descriptivos en los botones de ícono de `DetalleIncidencia.jsx`, `Incidencias.jsx`, `ModalCierreMantenimiento.jsx`, `NotificacionesDropdown.jsx` y `CriticalAlertBanner.jsx`.

### 2.2. Fallo Inicial 2: `color-contrast` (Peso en Lighthouse: `weight = 7`) — ✅ CORREGIDO
- **Vistas donde fallaba antes:** Dashboard (Desktop: 96%), Detalle de Incidencia (Mobile: 88% / Desktop: 94%) y Detalle de Orden (Mobile: 87% / Desktop: 94%).
- **Por qué no pasaba antes:**
  WCAG 2.1 AA exige una relación de contraste mínima de **4.5:1** para texto normal. Lighthouse detectó cuatro grupos de elementos con contraste insuficiente:
  1. **Notificación flotante (`Toast.jsx`) en Dashboard:**
     - **Selector:** `div.min-h-screen > div.fixed > div.flex > p.font-medium`
     - **Medición real inicial:** Contraste de **3.80:1** (texto blanco `#ffffff` sobre fondo `bg-red-500` `#fb2c36`).
  2. **Metadatos y subtítulos en `DetalleIncidencia.jsx`:**
     - **Selectores:**
       - `div.p-6 > div.flex > div.flex > span.text-xs` (`"Creada: ..."`)
       - `div.bg-white > div.grid > div > h4.text-xs` (`"Activo Afectado"`, `"Técnico Asignado"`)
       - `div.min-h-screen > main.flex-1 > div.bg-white > h4.text-xs` (`"Descripción del problema"`)
     - **Medición real inicial:** Contraste de **2.60:1** (texto `text-gray-400` `#99a1af` sobre fondo blanco `#ffffff`).
  3. **Etiquetas de resumen en `DetalleOrden.jsx`:**
     - **Selector:** `div.p-5 > div.grid > div.bg-gray-50 > span.text-[11px]` (`"Incidencia Asociada"`, `"Activo Afectado"`, `"Técnico Designado"`)
     - **Medición real inicial:** Contraste de **2.48:1** (texto `text-gray-400` `#99a1af` sobre fondo `bg-gray-50` `#f9fafb`).
  4. **Botón de acción primaria en `DetalleOrden.jsx`:**
     - **Selector:** `#btn-abrir-modal-cierre` (`"Gestionar Cierre / Rechazo"`)
     - **Medición real inicial:** Contraste de **3.65:1** (texto blanco `#ffffff` sobre fondo `bg-emerald-600` `#009966`).
- **Cambio aplicado en el código (Resuelto):**
  Se sustituyeron las clases `text-gray-400` por `text-gray-600` (elevando el contraste por encima de **7.0:1** sobre blanco y `bg-gray-50`), y se oscurecieron los fondos semánticos con texto blanco de `-500`/`-600` a `-700` (`bg-red-700`, `bg-emerald-700`, `bg-blue-700`, `bg-indigo-700`), superando **5.0:1** en todos los controles (incluyendo estados condicionales en `PanelIncidenciaRechazada.jsx`, `AprobacionReportante.jsx`, `ModalCierreMantenimiento.jsx` e `Incidencias.jsx`).

### 2.3. Fallo Inicial 3: `heading-order` (Peso en Lighthouse: `weight = 3`) — ✅ CORREGIDO
- **Vistas donde fallaba antes:** Detalle de Incidencia (Mobile: 88% / Desktop: 94%) y Detalle de Orden (Mobile: 87% / Desktop: 94%).
- **Por qué no pasaba antes:**
  En ambas vistas de detalle, el título principal se renderiza como `<h1>` (`<h1>{incidencia.titulo}</h1>` y `<h1>{orden.incidencia_titulo}</h1>`), pero los subtítulos inmediatamente posteriores dentro del contenedor principal saltaban directamente a `<h4>` (`<h4 class="text-xs uppercase ...">Activo Afectado</h4>` e `<h4 ...>Instrucciones del Supervisor</h4>`), omitiendo los niveles jerárquicos `<h2>` y `<h3>`.
- **Cambio aplicado en el código (Resuelto):**
  Se reestructuró la jerarquía semántica de encabezados en `DetalleIncidencia.jsx`, `DetalleOrden.jsx`, `PanelIncidenciaRechazada.jsx` y `AprobacionReportante.jsx` para que todos los bloques principales bajo `<h1>` utilicen `<h2>` y las subsecciones internas utilicen `<h3>`, manteniendo un orden estrictamente secuencial (`h1 -> h2 -> h3`).

### 2.4. Ajuste Adicional: `label-content-name-mismatch` — ✅ CORREGIDO
- **Dónde se detectó:** Botón de salida en `Layout.jsx` en vista Desktop.
- **Causa y solución:** El botón muestra el texto visible `"Salir"` en escritorio y tenía `aria-label="Cerrar sesión"`. Según WCAG 2.5.3 (*Label in Name*), el `aria-label` debe incluir el texto visible, por lo que se actualizó a `aria-label="Salir - Cerrar sesión"`.

---

## 3. ¿En qué SÍ se pasó? (Desglose de las 26 Reglas Aprobadas en Lighthouse)

Con los cambios aplicados en la rama actual, las 4 vistas obtienen **100% en Mobile y 100% en Desktop** con **0 auditorías fallidas**. A continuación se listan las auditorías automatizadas de Lighthouse v13.6.0 que **pasan al 100% (`score: 1`)**:

| ID de Auditoría Lighthouse | Regla Evaluada | Login | Dashboard | Detalle Incidencia | Detalle Orden |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `aria-allowed-attr` | Los atributos `aria-*` están permitidos para el rol del elemento | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `aria-conditional-attr` | Los atributos `aria-*` condicionales se usan según especificación | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `aria-deprecated-role` | No se utilizan roles ARIA obsoletos | N/A | ✅ 100% | ✅ 100% | ✅ 100% |
| `aria-hidden-body` | `aria-hidden="true"` no está presente en el `<body>` | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `aria-hidden-focus` | Elementos con `aria-hidden="true"` no contienen elementos enfocables | N/A | ✅ 100% | ✅ 100% | ✅ 100% |
| `aria-prohibited-attr` | No se usan atributos ARIA prohibidos en los elementos | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `aria-required-attr` | Los roles ARIA tienen todos los atributos requeridos (`aria-expanded`, etc.) | N/A | ✅ 100% | ✅ 100% | ✅ 100% |
| `aria-roles` | Todos los valores `role="..."` son roles ARIA válidos | N/A | ✅ 100% | ✅ 100% | ✅ 100% |
| `aria-valid-attr-value` | Todos los atributos `aria-*` tienen valores válidos | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `aria-valid-attr` | Todos los atributos `aria-*` tienen nombres válidos | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `button-name` | Todos los botones tienen un nombre accesible (`aria-label` o texto) | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `color-contrast` | Relación de contraste suficiente (`>= 4.5:1` texto normal / `>= 3:1` grande) | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `document-title` | El documento tiene elemento `<title>` descriptivo | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `heading-order` | Los encabezados (`h1`-`h6`) siguen un orden descendente secuencial | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `html-has-lang` | El elemento `<html>` tiene atributo `[lang]` | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `html-lang-valid` | El atributo `lang="es"` en `<html>` es un código BCP 47 válido | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `image-alt` | Los elementos `<img>` tienen atributos `[alt]` descriptivos | N/A | N/A | ✅ 100% | N/A |
| `label` | Los elementos de formulario (`<input>`, `<select>`) tienen `<label>` asociado | ✅ 100% | N/A | N/A | N/A |
| `label-content-name-mismatch` | Los elementos con texto visible incluyen ese texto en su `aria-label` | N/A | ✅ 100% | ✅ 100% | ✅ 100% |
| `landmark-one-main` | El documento tiene un landmark principal `<main>` | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `link-name` | Todos los enlaces (`<a>`) tienen un nombre discernible | N/A | ✅ 100% | ✅ 100% | ✅ 100% |
| `list` / `listitem` | Las listas (`<ul>`, `<li>`) están estructuradas semánticamente | N/A | ✅ 100% | ✅ 100% | ✅ 100% |
| `meta-viewport` | `[user-scalable="no"]` no se usa y `[maximum-scale]` no es menor a 5 | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `table-fake-caption` | Las tablas usan `<caption>` en lugar de celdas con `colspan` simuladas | N/A | ✅ 100% | N/A | N/A |
| `target-size` | Los controles táctiles tienen tamaño y espaciado suficiente | ✅ 100% | ✅ 100% | ✅ 100% | ✅ 100% |
| `td-headers-attr` | Las celdas de tabla en `Dashboard` usan encabezados válidos | N/A | ✅ 100% | N/A | N/A |

---

## 4. ¿Qué controles quedan como "Revisión Manual" en Lighthouse (`score: null`)?

Aunque el **puntaje automatizado de Lighthouse ya es del 100%** en todas las vistas (superando el criterio de aceptación `> 90%` del ticket **TAL-145**), Google Lighthouse incluye siempre una sección informativa llamada *"Additional items to manually check (10)"* que no suma ni resta al porcentaje automático porque requiere verificación humana:

1. **`focus-traps` y `custom-controls-roles` en Modales:**
   - *Por qué no lo mide el score automático:* Lighthouse audita la carga de la vista sin requerir interacción manual para atrapar el foco con `Tab` dentro de modales.
   - *Qué haría falta si en el futuro se buscara certificación manual WCAG 2.1 AA completa:* Incorporar un *focus trap* cíclico al presionar `Tab` / `Shift+Tab` dentro de `ModalPrevisualizadorImagen` y `ModalCierreMantenimiento`.
2. **`bypass` / `logical-tab-order` (Enlace "Saltar al contenido"):**
   - *Qué haría falta para revisión manual:* Agregar un enlace oculto visualmente (`sr-only focus:not-sr-only`) al inicio de `Layout.jsx` que salte directo a `<main>` al tabular.

---

## 5. Resumen de Archivos Modificados en el Repositorio

| Archivo | Cambios Aplicados |
| :--- | :--- |
| `frontend-web/index.html` | Cambio de `<html lang="en">` a `<html lang="es">` y actualización de `<title>` descriptivo en español. |
| `frontend-web/src/Login.jsx` | Cambio del contenedor raíz `<div>` a `<main>` para cumplir `landmark-one-main`, adición de `aria-hidden="true"` en SVG decorativo y mejora de contraste en textos auxiliares (`text-gray-500` -> `text-gray-600`). |
| `frontend-web/src/components/Layout.jsx` | Adición de `aria-label` a los botones móviles de abrir/cerrar menú (`button-name`), `aria-label="Salir - Cerrar sesión"` en botón de logout (`label-content-name-mismatch`) y mejora de contraste en subtítulo del rol activo. |
| `frontend-web/src/components/Toast.jsx` | Ajuste de colores de fondo (`bg-red-700`, `bg-emerald-700`, `bg-blue-700`) para superar el contraste mínimo de `4.5:1` con texto blanco y adición de `role="status" aria-live="polite"`. |
| `frontend-web/src/components/SelectorTecnicoSesion.jsx` | Asociación explícita `htmlFor="selector-tecnico-sesion"` / `id="selector-tecnico-sesion"` y `aria-label` en el `<select>` de filtro de técnico. |
| `frontend-web/src/components/NotificacionesDropdown.jsx` | Adición de `aria-expanded={abierto}` y `aria-haspopup="true"` en la campana de notificaciones, y `aria-label` en botones de marcar como leída y cerrar panel. |
| `frontend-web/src/components/CriticalAlertBanner.jsx` | Adición de `aria-label` descriptivo al botón de descartar alerta crítica (`<FiX />`). |
| `frontend-web/src/components/BotonExportarExcel.jsx` | Mejora de contraste (`bg-emerald-700`) y adición de `aria-label="Exportar historial de incidencias a Excel"`. |
| `frontend-web/src/components/PanelIncidenciaRechazada.jsx` | Corrección de nivel de encabezado (`<h2>`) y mejora de contraste en badge de fecha de rechazo (`text-red-800`). |
| `frontend-web/src/components/AprobacionReportante.jsx` | Corrección de nivel de encabezado (`<h2>`), asociación `htmlFor`/`id` en `<textarea>` de rechazo y mejora de contraste en botones (`bg-emerald-700`, `bg-red-700`). |
| `frontend-web/src/components/ModalCierreMantenimiento.jsx` | Adición de `aria-label` a inputs y botones de materiales, y mejora de contraste (`text-gray-600`, `bg-emerald-700`, `bg-red-700`). |
| `frontend-web/src/views/Dashboard.jsx` | Mejora de contraste en encabezados de tabla, tarjetas KPI y textos de estado vacío (`text-gray-400`/`500` -> `text-gray-600`). |
| `frontend-web/src/views/Incidencias.jsx` | Adición de `aria-label` al buscador y enlaces de detalle con solo ícono, y mejora de contraste en badges y botones de acción (`bg-indigo-700`, `bg-blue-700`, `bg-emerald-700`, `text-gray-600`). |
| `frontend-web/src/views/DetalleIncidencia.jsx` | Reparación de error de sintaxis por conflicto de merge previo; corrección de jerarquía de encabezados (`h1 -> h2 -> h3`) en todos los estados; mejora de contraste (`2.60:1` -> `> 7.0:1`) y adición de `aria-label` al botón de zoom de evidencia en Cloudinary. |
| `frontend-web/src/views/DetalleOrden.jsx` | Corrección de jerarquía de encabezados (`h1 -> h2 -> h3`) en todos los estados; mejora de contraste en etiquetas de resumen (`2.48:1` -> `> 7.0:1`) y en el botón `#btn-abrir-modal-cierre` (`3.65:1` -> `> 5.0:1` con `bg-emerald-700`). |
