# Documentación de Implementación: TAL-206 - Guía Visual Interactiva de Usuario (Onboarding Tour)

## 1. Contexto y Propósito

El objetivo de esta tarea es facilitar la adopción de la plataforma institucional InfraManager por parte de los diferentes perfiles institucionales (Reportante, Técnico, Supervisor y Administrador) mediante un recorrido interactivo guiado (*Onboarding Tour*) que se adapte dinámicamente a los permisos efectivos definidos en la matriz de control de acceso basada en permisos (PBAC) y en estricta coherencia con el Diagrama de Casos de Uso y la adecuación de la dependencia TAL-222.

---

## 2. Decisiones de Diseño y Arquitectura

- **Componente Nativo en React 19 (`frontend-web/src/components/UserTourGuide.jsx`)**: Se implementa un componente autónomo sin dependencias externas pesadas, asegurando máxima compatibilidad con el ecosistema del proyecto y evitando inconsistencias de dependencias.
- **Renderizado mediante Portal**: Montaje en `document.body` mediante `createPortal` para sobreponerse limpiamente sobre cualquier elemento con `z-index` elevado.
- **Enfoque de Navegación (Opción A)**: Recorrido anclado a los elementos de control y navegación del `Layout.jsx` (Sidebar, Header, Perfil de Usuario, Cola Offline y Acciones Rápidas), evitando recargas o saltos de pantalla que generen parpadeos o bloqueos por llamadas asíncronas pendientes.
- **Filtrado Dinámico PBAC por Rol**: Cada paso evalúa `hasPermission()` proveniente de `authService.js`.
  - **Reportante**: Paso de bienvenida personalizada y paso directo hacia el reporte de incidencias y sugerencia de activo (`incidencias:crear`, `evidencias:subir`), además del seguimiento en la bandeja de incidencias (`incidencias:ver`). 
  - **Técnico**: Destaca la bandeja de incidencias globales, el acceso a sus órdenes asignadas, el registro de diagnóstico y marcado de resuelta (`ordenes:diagnosticar`, `incidencias:resolver`), la consulta de trazabilidad histórica (`incidencias:ver`) y la facultad de reportar incidencias en terreno (`incidencias:crear`).
  - **Supervisor**: Destaca la clasificación y priorización de severidad dinámica (`incidencias:clasificar_prioridad`), asignación a técnicos según disponibilidad (`ordenes:asignar`, `usuarios:ver`), planificación en la agenda preventiva (`mantenimientos:crear`) y trazabilidad de activos (`incidencias:ver`).
  - **Administrador**: Destaca la gestión integral del inventario de activos (`activos:gestionar`), métricas y KPIs analíticos en el Dashboard (`estadisticas:ver`), exportación de reportes a planillas Excel (`reportes:exportar`), control y auditoría de usuarios y roles (`usuarios:gestionar`, `usuarios:ver`) y trazabilidad global.
- **Accesibilidad y Persistencia**:
  - Navegación bidireccional accesible por puntero y teclado (`Enter`/`Flecha Derecha` para avanzar, `Flecha Izquierda` para retroceder, `Escape` para saltar o salir).
  - Persistencia de finalización u omisión por usuario en `localStorage` con la clave `inframe_tour_completed_${usuarioId}`.
  - Reanudación voluntaria en cualquier momento mediante un botón de ayuda accesible ubicado en el `Header.jsx` del `Layout.jsx`.

---

## 3. Registro Continuo de Archivos Modificados

archivo modificado: `frontend-web/src/utils/userTourStorage.js`: Módulo desacoplado de utilidades de almacenamiento y persistencia para la guía interactiva. Expone `obtenerClaveStorageTour`, `haCompletadoRecorrido` y `registrarFinalizacionRecorrido`, aislando la lógica de `localStorage` bajo el identificador único del usuario autenticado para garantizar que la finalización u omisión no sea intrusiva y soporte ejecuciones sin transpilación en suites de pruebas unitarias.

archivo modificado: `frontend-web/src/components/UserTourGuide.jsx`: Creación y ajuste del componente de guía visual interactiva de usuario (*Onboarding Tour*). Implementa navegación accesible mediante controles de puntero y atajos de teclado (Escape para omitir, Flecha Derecha/Enter para avanzar y Flecha Izquierda para retroceder), renderizado en portal sobre `document.body` y filtrado dinámico de pasos mediante `hasPermission()` en estricta correspondencia con los permisos PBAC y el Diagrama de Casos de Uso. Para el rol Reportante, por instrucción explícita se omite la trazabilidad QR y se avanza directamente al reporte y seguimiento de incidencias, esto principalmente por que no tendria sentido, siendo que no existe boton relacionado a QR. En dispositivos móviles (< 1024px), interactúa reactivamente con el Layout abriendo automáticamente el panel lateral (*Sidebar*) al transicionar a pasos que requieran opciones del menú (como el paso 2 de 5), sincronizando el cálculo de coordenadas con la animación de deslizamiento del panel y cerrándolo de manera limpia al finalizar o saltar el tour. Además, en teléfonos celulares (< 768px), posiciona ergonómicamente el popover en la parte inferior o superior sin solapar el elemento enfocado. Desacopló el fondo oscuro global e implementó la técnica de recorte por sombra perimetral masiva (`boxShadow: 0 0 0 9999px rgba(3, 7, 18, 0.70)`) en el recuadro del *spotlight*, dejando el interior completamente transparente y nítido con el aro perimetral `ring-4 ring-primary`, preservando la nitidez visual y legibilidad de los elementos del menú lateral y la interfaz. Consume las funciones utilitarias de `userTourStorage.js` para persistir la finalización u omisión por identificador de usuario en `localStorage`.

archivo modificado: `frontend-web/src/components/Layout.jsx`: Integración de la guía interactiva en la estructura de la aplicación. Se incorporan atributos de anclaje `data-tour` en los enlaces de navegación del Sidebar (`nav-dashboard`, `nav-incidencias`, `nav-inventario`, `nav-mantenimientos`, `nav-trazabilidad`, `nav-usuarios`), en la tarjeta de perfil institucional del usuario (`tarjeta-usuario`) y en el control de cola de sincronización offline (`cola-sincronizacion`). Se implementa la activación automática mediante `useEffect` en el primer inicio de sesión cuando `haCompletadoRecorrido(usuario)` retorna falso. Se añaden botones de ayuda accesibles con ícono `FiHelpCircle` tanto en el `Header.jsx` como en el pie del Sidebar para permitir la reapertura manual del recorrido en cualquier momento sin alterar la persistencia previa. Se conecta el callback `alCambiarEstadoMenuMovil` para permitir que el tour despliegue o contraiga el Sidebar móvil en sincronía con los pasos activos.





