# TAL-182: Componente Visual de Indicador de Estado de Conexión (ConnectivityBadge)

- **Identificador de Tarea:** TAL-182
- **Sprint / Período:** Sprint 3 - Semana 1
- **Módulos Involucrados:** `frontend-web` (`src/components/ConnectivityBadge.jsx`, `src/components/NetworkStatusBanner.jsx`, `src/App.jsx`)
- **Estado:** ✅ Completado y Verificado (100% Criterios de Aceptación)

---

## 1. Diagnóstico y Especificación del Requerimiento

### 1.1. Objetivo Institucional
> **Objetivo:** Informar al usuario de forma clara y no intrusiva el estado actual de la conectividad en la interfaz.

### 1.2. Descripción Técnica
> **Descripción:** Diseñar un componente flotante o banner superior (`ConnectivityBadge.jsx`) que despliegue una píldora con micro-animación en color verde esmeralda ('Conectado al Sistema'), amarillo ámbar ('Conexión inestable') o rojo carmesí ('Sin conexión').

---

## 2. Criterios de Aceptación y Estado de Cumplimiento

| Criterio de Aceptación | Descripción del Requerimiento | Estado | Verificación Técnica |
| :--- | :--- | :---: | :--- |
| **Criterio 1: Ocultamiento a los 4s** | Se oculta sutilmente tras 4 segundos de volver al estado online. | ✅ **Cumplido al 100%** | Se implementó la constante institucional `AUTO_HIDE_DELAY_MS = 4000` con `FADE_OUT_DURATION_MS = 500`. Al transicionar a online tras un fallo, activa una transición CSS suave de opacidad y desplazamiento (`opacity-0 -translate-y-2`) a los 3.5s antes de desmontarse completamente a los 4s. Limpieza garantizada de temporizadores con `clearTimeout`. |
| **Criterio 2: Fijación superior y botón 'Comprobar ahora'** | Permanece fijo en la parte superior cuando se pierde la conexión con botón 'Comprobar ahora'. | ✅ **Cumplido al 100%** | Posicionamiento flotante superior centrado (`fixed top-3 sm:top-4 inset-x-0 z-50 flex justify-center`). Ante pérdida de red (`!isOnline`) o fallo de gateway (`!isServerReachable`), permanece visible e integra el botón accesible `'Comprobar ahora'`, el cual invoca `checkHeartbeat()` y muestra micro-animación de giro (`animate-spin`) durante la verificación. |
| **Criterio 3: Responsividad Móvil y Escritorio** | Totalmente responsivo en móvil y escritorio. | ✅ **Cumplido al 100%** | Contenedor no intrusivo con `pointer-events-none` (para no bloquear clics ni navegación táctil) y píldora con `pointer-events-auto`. Clases adaptativas Tailwind (`text-xs sm:text-sm`, `max-w-full truncate`, padding elástico `px-3.5 sm:px-4`). |
| **Criterio 4: SonarQube y Prevención de Duplicación** | Evita código duplicado, cumple requerimientos de SonarQube, tal como evitar code smells, entre otros. | ✅ **Cumplido al 100%** | 0 warnings y 0 errores en `oxlint`. Extracción modular de componentes reusables `StatusBeacon` y `ComprobarButton`. Prevención de fugas de memoria con limpieza estricta de efectos y sin llamadas a `setState` síncronas innecesarias dentro de `useEffect`. Cumplimiento estricto de WAI-ARIA (`role="alert"`, `role="status"`, `aria-live`). |

---

## 3. Matriz de Estados y Micro-Animaciones

| Estado | Condición de Activación | Color y Clases Tailwind | Micro-Animación | Texto y Rol ARIA |
| :--- | :--- | :--- | :--- | :--- |
| **Conectado** | `isOnline && isServerReachable` (tras recuperación) | Verde esmeralda (`bg-emerald-600 border-emerald-500`) | Baliza con ping suave (`animate-ping bg-emerald-300`) | `'Conectado al Sistema'` (`role="status"`, `aria-live="polite"`) |
| **Inestable** | `isOnline && !isServerReachable` (Gateway 502/503) | Amarillo ámbar (`bg-amber-600 border-amber-500`) | Baliza intermitente (`animate-pulse bg-amber-200`) | `'Conexión inestable'` (`role="alert"`, `aria-live="assertive"`) + Botón `'Comprobar ahora'` |
| **Desconectado** | `!isOnline` (pérdida de señal local) | Rojo carmesí (`bg-rose-700 border-rose-600`) | Baliza intensa (`animate-ping bg-rose-300`) + ícono pulsante | `'Sin conexión'` (`role="alert"`, `aria-live="assertive"`) + Botón `'Comprobar ahora'` |

---

## 4. Retrocompatibilidad y Arquitectura

* **`ConnectivityBadge.jsx`**: Nuevo componente oficial que centraliza la lógica visual de conectividad.
* **`NetworkStatusBanner.jsx`**: Mantiene retrocompatibilidad como proxy delegador hacia `ConnectivityBadge`, garantizando que ninguna prueba existente o importación heredada se quiebre.
* **`App.jsx`**: Monta `<ConnectivityBadge />` de manera global dentro de `NetworkStatusProvider` y `ToastProvider` para cubrir todas las rutas (públicas y autenticadas).

## 5. Matriz de Archivos Involucrados (Modificados y Creados)

A continuación se detalla cada archivo intervenido en el marco de la tarea **TAL-182**, indicando su tipo y la justificación técnica de su incorporación o modificación:

| Capa / Subsistema | Archivo (Ruta Relativa) | Tipo | Justificación Técnica y Razón del Cambio |
| :--- | :--- | :---: | :--- |
| **Componentes UI** | `frontend-web/src/components/ConnectivityBadge.jsx` | **Creado** | Implementación del nuevo componente flotante tipo píldora. Gestiona el ciclo de vida de los estados de conectividad, micro-animaciones en tres colores semánticos (verde esmeralda, amarillo ámbar y rojo carmesí), la acción de reintento manual mediante el botón `'Comprobar ahora'` y el auto-ocultado con fade-out sutil tras 4 segundos (`AUTO_HIDE_DELAY_MS = 4000`). Resuelve los criterios de SonarQube evitando código duplicado mediante sub-componentes (`StatusBeacon`, `ComprobarButton`) y garantizando limpieza de temporizadores (`clearTimeout`). |
| **Componentes UI** | `frontend-web/src/components/NetworkStatusBanner.jsx` | **Modificado** | Refactorizado para actuar como un *wrapper* o proxy retrocompatible que renderiza directamente `ConnectivityBadge`. Esta adaptación evita que se rompan referencias cruzadas o pruebas de integración heredadas (como la suite Cypress de TAL-180), asegurando una transición arquitectónica suave y sin regresiones. |
| **Estructura Global** | `frontend-web/src/App.jsx` | **Modificado** | Reemplazo del montaje de `<NetworkStatusBanner />` por `<ConnectivityBadge />` en la raíz de la aplicación (dentro de `NetworkStatusProvider` y `ToastProvider`). Esto asegura que la píldora flotante esté presente y visible en todas las rutas del sistema, incluyendo vistas públicas (`/login`), páginas de error (`/500`, `/404`) y vistas autenticadas. |
| **Configuración** | `frontend-web/package.json` | **Modificado** | Actualización del script `"test:unit"` para incluir la ejecución automática de la nueva suite `src/components/ConnectivityBadge.test.mjs`, permitiendo que las pruebas unitarias se ejecuten de forma unificada en el pipeline de desarrollo y CI/CD. |
| **Pruebas Unitarias**| `frontend-web/src/components/ConnectivityBadge.test.mjs` | **Creado** | Suite de pruebas unitarias automatizadas con `node:test` y `node:assert/strict` que valida el cumplimiento estricto de los 4 criterios de aceptación: temporizador de 4s (4000ms) y desvanecimiento de 500ms, presencia del botón `'Comprobar ahora'`, clases Tailwind responsivas (móvil/escritorio) y roles semánticos de accesibilidad WAI-ARIA. |
| **Pruebas E2E** | `frontend-web/cypress/e2e/tal-182-connectivity-badge.cy.js` | **Creado** | Suite de pruebas End-to-End con Cypress que simula la pérdida de señal (`offline`), fallas sostenidas del API Gateway (502), reconexión en caliente (`online`), validación del auto-ocultado tras 4s, clic interactivo en `'Comprobar ahora'` y responsividad en vista móvil (`iphone-x`). |
