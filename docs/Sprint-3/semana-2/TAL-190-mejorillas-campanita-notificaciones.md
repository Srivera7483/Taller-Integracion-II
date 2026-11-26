# Documentación Técnica — TAL-190: Campana de Notificaciones Interactiva en Header con Badge Dinámico

- **Título:** Campana de Notificaciones Interactiva en Header con Badge Dinámico

---

## 1. Contexto y Objetivos del Requerimiento

### Objetivo General
Mejorar el componente de la campana en el Header para que muestre el número de notificaciones no leídas y se actualice al instante ante eventos del sistema.

### Descripción Funcional
Actualizar el componente Header (`Header.jsx`) para conectar la campana de notificaciones con el contador en tiempo real mediante WebSocket. Al llegar un nuevo evento WebSocket (`nueva_incidencia`, `incidencia_actualizada`, `orden_asignada`, `estado_cambiado`), el badge numérico se incrementa automáticamente con animación de rebote (*bounce effect*) y despliega la lista con las últimas 5 notificaciones relevantes, permitiendo navegar directamente a cada incidencia/mantenimiento o marcar todas como leídas con desaparición fluida del badge.

---

## 2. Cumplimiento de Criterios de Aceptación (`TAL-190`)

| Criterio de Aceptación (Jira `TAL-190`) | Estado | Verificación Técnica |
| :--- | :---: | :--- |
| **CA-1: El badge muestra el número exacto de notificaciones no leídas (ej. +3).** | ✅ Cumple | La función `formatBadgeCount(count)` formatea con exactitud el total no leído con prefijo `+` (ej. `+3` para 3 alertas, `+1`, `+5`, truncando en `+99` para cantidades superiores a 99). El arreglo inicial `NOTIFICACIONES_INICIALES` parte con 3 alertas no leídas reflejando inmediatamente `+3`. El badge solo se renderiza cuando `noLeidas > 0`. |
| **CA-2: Despliega menú al hacer click con enlaces y botón 'Marcar todo como leído'.** | ✅ Cumple | Al hacer clic en el botón de la campana (`aria-expanded`, ClickAway listener nativo), se abre el popover Glassmorphism que despliega las últimas 5 notificaciones (`slice(0, 5)`). Cada ítem está vinculado mediante componentes `<Link>` de `react-router-dom` a su ruta correspondiente (`/incidencias/:id`, `/mantenimientos`). La cabecera incluye el botón con texto exacto `Marcar todo como leído`. |
| **CA-3: Al marcar como leídas, el badge desaparece fluidamente.** | ✅ Cumple | La acción `marcarTodasLeidas` actualiza todas las alertas en memoria a `leida: true`, reduciendo `noLeidas` a `0`. El badge numérico está envuelto en `<AnimatePresence>` de `framer-motion` configurado con `exit={{ scale: 0, opacity: 0, transition: { duration: 0.35, ease: 'easeInOut' } }}` y clases Tailwind `transition-all duration-300 ease-in-out`, logrando una contracción y desvanecimiento suave y fluido sin parpadeos. |

---


## 3. Archivos Creados y Modificados

1. **`frontend-web/src/components/Header.jsx` (Nuevo):**
   - Extrae y encapsula la cabecera principal de la aplicación.
   - Integra el botón de menú móvil (`FiMenu`), el título dinámico de la página (`title`), el indicador de conectividad (`NetworkStatusIndicator`) y la campana interactiva (`NotificacionesDropdown`).
2. **`frontend-web/src/utils/notificaciones.js` (Nuevo):**
   - Centraliza las funciones de dominio:
     - `NOTIFICACIONES_INICIALES`: Lista con 3 notificaciones no leídas con enlaces navegables.
     - `formatBadgeCount(count)`: Formateo con formato exacto `+N` (ej. `+3`).
     - `normalizarEventoNotificacion(payload, eventName)`: Adaptador de eventos Socket.io a modelos de notificación.
     - `contarNoLeidas`, `marcarTodasComoLeidas`, `marcarNotificacionComoLeida`.
3. **`frontend-web/src/components/NotificacionesDropdown.jsx` (Modificado / Mejorado):**
   - Conectado a `useWebSocket` para recibir eventos en tiempo real.
   - Implementa animación reactiva de rebote (`animate-bounce` + keyframes de escala con Framer Motion).
   - Implementa desaparición fluida del badge con `<AnimatePresence>`.
   - Limita y presenta las últimas 5 alertas con enlaces de navegación `<Link>` y botón `"Marcar todo como leído"`.
4. **`frontend-web/src/components/Layout.jsx` (Modificado):**
   - Sustituye la etiqueta `<header>` inline por el componente modular `<Header />`.
   - Limpieza de importaciones huérfanas (`FiMenu`, `NetworkStatusIndicator`).

---

## 4. Resultados de Validación y Pruebas

- **Pruebas Unitarias (`pnpm test:unit`):** 34 tests ejecutados, 34 aprobados, 0 fallos.
- **Compilación de Producción (`pnpm build`):** Generación exitosa de bundles de Vite y Service Worker PWA en ~1.0s.
- **Análisis Estático (`pnpm lint`):** 0 errores detectados por `oxlint`.
