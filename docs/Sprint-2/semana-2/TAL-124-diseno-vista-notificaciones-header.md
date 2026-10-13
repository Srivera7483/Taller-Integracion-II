# TAL-124: Diseño de Vista de Notificaciones en el Header

## 1. Información de la Tarea de Jira
* **Código:** TAL-124
* **Título:** Diseño de vista de notificaciones en Header
* **Tiempo Total Estimado / Imputado:** 2h 30m (`#time 2h 30m`)

---

## 2. Contexto y Objetivos del Requerimiento

### Objetivo General
Ofrecer una forma rápida, accesible y visualmente clara de ver las alertas recientes del sistema dentro de la plataforma web sin depender exclusivamente de notificaciones por correo electrónico.

### Descripción Funcional
Diseñar e integrar un icono de campana en el Header/Navbar de la aplicación web. Al hacer clic sobre él, debe desplegarse un Popover o Dropdown flotante con estética elegante (efecto Glassmorphism y utilidades de Tailwind CSS). El menú debe presentar una lista simulada inicial de 3 notificaciones del sistema (por ejemplo, asignaciones de incidencias y actualizaciones de mantenimiento) e incorporar micro-interacciones sutiles al pasar el cursor (hover effects) sobre cada alerta.

### Criterios de Aceptación Cumplidos:
- [x] **Icono de campana en Header/Navbar:** Integrado en la barra superior (`Topbar`) dentro del layout principal.
- [x] **Dropdown flotante con Glassmorphism:** Menú desplegable con fondo translúcido (`backdrop-blur-md`), bordes suaves y sombra profunda.
- [x] **Lista inicial de 3 notificaciones simuladas:** Datos dummy estructurados que reflejan eventos reales de incidencias y mantenimientos de activos.
- [x] **Hover effects sutiles:** Transiciones fluidas en cada tarjeta de notificación y sus iconos según el tipo de alerta.
- [x] **ClickAway Listener:** Cierre automático del Popover al detectar clics fuera del contenedor mediante listener nativo en el documento.
- [x] **Indicador visual de alertas no leídas:** Punto rojo con animación de pulso (`animate-ping`) sobre la campana cuando existen elementos no leídos, que desaparece al marcarlas.

---

## 3. Arquitectura y Componentes Desarrollados

### 3.1. Componente `NotificacionesDropdown.jsx`
Ubicación: `frontend-web/src/components/NotificacionesDropdown.jsx`

El componente se construyó de manera modular y desacoplada, encapsulando su lógica de estado, renderizado condicional y control de eventos:

1. **Estructura de Datos Simulada (`NOTIFICACIONES_INICIALES`):**
   - **Incidencia asignada:** `"Te han asignado la Incidencia #45"` (categoría `incidencia`, icono de advertencia en tono ámbar).
   - **Mantenimiento programado:** `"Mantenimiento preventivo para Activo #18"` (categoría `activo`, icono de herramienta en tono índigo).
   - **Resolución de incidencia:** `"Incidencia #12 cambio a estado Resuelta"` (categoría `estado`, icono de verificación en tono esmeralda).

2. **Control de Estado:**
   - `abierto`: Booleano que controla la visibilidad del Popover.
   - `notificaciones`: Arreglo reactivo que almacena la colección actual de alertas.
   - `noLeidas`: Cálculo dinámico derivado (`notificaciones.filter(n => !n.leida).length`).

3. **Cierre al Hacer Clic Fuera (ClickAway):**
   - Utiliza una referencia reactiva `dropdownRef` (`useRef(null)`).
   - Registra un listener sobre el evento `mousedown` en `document` únicamente cuando el menú se encuentra abierto (`abierto === true`), desuscribiéndolo en la función de limpieza del hook `useEffect` para evitar fugas de memoria.

4. **Interacciones de Usuario:**
   - **Clic en notificación individual:** Invoca `marcarComoLeida(id)`, reduciendo el contador y aplicando una atenuación visual (`opacity-75`) al ítem.
   - **Marcar todas como leídas:** Botón en la cabecera que actualiza todos los registros a `leida: true` de forma atómica.

5. **Diseño Visual y Glassmorphism:**
   - Clases Tailwind aplicadas al popover: `bg-white/90 backdrop-blur-md border border-white/60 shadow-2xl ring-1 ring-black/5 rounded-2xl`.
   - Distinción visual para elementos no leídos mediante fondo `bg-blue-50/40` y un dot azul indicativo.

---

### 3.2. Integración en `Layout.jsx`
Ubicación: `frontend-web/src/components/Layout.jsx`

El componente se ubicó en el Topbar del layout general:
- Situado en el contenedor de acciones rápidas a la derecha de la barra de navegación superior.
- Alineado junto al selector de técnico de sesión (`SelectorTecnicoSesion`) y el botón de cierre de sesión (`handleLogout`).

```jsx
<header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
  <div className="flex items-center gap-3 sm:gap-4">
    {/* Botón menú móvil y título de la vista */}
    ...
  </div>
  <div className="flex items-center gap-2 sm:gap-3">
    <NotificacionesDropdown />
    <SelectorTecnicoSesion />
    <button onClick={handleLogout} ...>
      ...
    </button>
  </div>
</header>
```

---

## 4. Resumen de Archivos Creados y Modificados

| Archivo | Tipo | Propósito |
|---|---|---|
| `frontend-web/src/components/NotificacionesDropdown.jsx` | Creado | Implementación del botón de campana, badge animado, detector de clics externos y popover glassmorphism con notificaciones dummy. |
| `frontend-web/src/components/Layout.jsx` | Modificado | Importación e inserción de `NotificacionesDropdown` en el Topbar/Header principal de la interfaz web. |

---

## 5. Pruebas y Validación Funcional

1. **Apertura y Cierre:**
   - Al presionar el botón de la campana se despliega el popover con animación fluida `animate-fadeIn`.
   - Al volver a pulsar la campana, el popover se oculta.
2. **ClickAway Listener:**
   - Al hacer clic en cualquier área externa de la pantalla (sidebar, contenido principal o fondo), el dropdown se cierra de manera inmediata sin afectar otros componentes.
3. **Indicador de Alertas No Leídas:**
   - La campana muestra un badge rojo con efecto ping en su esquina superior derecha mientras existan notificaciones no leídas.
   - Al marcar las notificaciones o presionar "Marcar leídas", el badge desaparece dinámicamente.
4. **Diseño Responsivo y Hover Effects:**
   - Ancho adaptativo (`w-80 sm:w-96`) con scroll interno `max-h-80` para evitar desbordamientos en pantallas pequeñas o móviles.
   - Efectos de hover suaves con cambio de opacidad y acento de fondo al interactuar con cada alerta.
