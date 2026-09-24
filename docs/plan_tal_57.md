# Plan de Implementación: TAL-57 (Filtros Visuales por Estado)

## 📌 Objetivo
Desarrollar e integrar un sistema de **filtros visuales interactivos** (Tabs/Pestañas) en el frontend, para que los usuarios (Administradores y Técnicos) puedan agrupar y segmentar las incidencias/órdenes según su estado de forma intuitiva, sin recargar la página.

## ✨ Especificaciones de Diseño (Premium UI)
*   **Controles de Navegación (Tabs):** En lugar de un simple select desplegable, usaremos pestañas horizontales estilizadas (*Pills* o *Underline Tabs*) que ofrezcan mejor accesibilidad visual.
*   **Estados Contemplados:** "Todas", "Pendientes", "En Progreso", "Resueltas".
*   **Micro-animaciones:** Efecto de deslizamiento (`transition-transform`) y cambio de color (`transition-colors`) al seleccionar un filtro.
*   **Contadores Dinámicos:** Cada pestaña incluirá un pequeño *badge* que indicará cuántas incidencias pertenecen a esa categoría.

## 🛠️ Pasos de Desarrollo

1.  **Exploración y Diagnóstico:**
    *   Analizar la vista `Incidencias.jsx` (o `Dashboard.jsx`) para identificar el punto exacto donde se renderiza la lista de tareas.
2.  **Creación del Componente de Filtro (`StatusFilter.jsx`):**
    *   Diseñar el componente reutilizable en Tailwind que reciba los estados, las cantidades y la función `onFilterChange`.
3.  **Implementación de Lógica en la Vista:**
    *   Agregar un estado local `activeFilter` en la vista contenedora.
    *   Interceptar los datos mostrados en pantalla (mock data por ahora) para filtrarlos dinámicamente antes de renderizarlos usando `.filter()`.
4.  **Validación y Commit:**
    *   Asegurar que el componente sea responsivo en móvil (Scroll horizontal de los filtros ocultando barras de scroll `scrollbar-hide`).
    *   Smart Commit: `[TAL-57] feat: implementar componentes de filtrado visual por estados de incidencias #time 1h 30m`.

---
*Si apruebas este plan con "Proceed", comenzaré a escanear tus archivos de vistas y a inyectar el código React.*
