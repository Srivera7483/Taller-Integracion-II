# TAL-96: Inyección de datos dinámicos en Dashboard

## 1. Contexto del Problema
Durante las primeras semanas de desarrollo (Sprint 1), el Panel de Control (`Dashboard.jsx`) renderizaba información estática (*mockups*) tanto para los indicadores numéricos (Resueltas, Críticas, Pendientes) como para la tabla de últimas incidencias. En la documentación de la TAL-48 ya se había estipulado que esta deuda técnica debía ser resuelta en el Sprint 2, migrando de una vista estática a una vista completamente reactiva y acoplada a la API Real.

## 2. Solución Arquitectónica Adoptada
Para inyectar vida al Dashboard, se estableció un flujo de consumo asíncrono utilizando Axios y los *Hooks* nativos de React, separando la lógica de peticiones del componente visual.

### 2.1. Implementación del Patrón de Servicios
*   Se creó el servicio centralizado `incidenciasService.js` bajo el patrón Service/Repository. Este archivo exporta funciones asíncronas (`fetchIncidencias`) encargadas de hacer el llamado HTTP `GET /api/v1/incidencias` hacia el API Gateway.
*   En `Dashboard.jsx` se eliminó el consumo de datos de las cookies/locales (`incidenciasStorage.js`).
*   Se implementaron los Hooks `useState` y `useEffect`. Al montarse el componente, el ciclo de vida dispara el llamado a la API, activa un estado de carga (`loading`) y, al resolver la promesa, inyecta los datos reales en el estado.

### 2.2. Ventajas Técnicas Obtenidas
1.  **Reactividad Pura:** Los KPIs (métricas en las tarjetas superiores) ya no se calculan sobre información ficticia; el `useMemo` ahora reevalúa automáticamente las prioridades y estados utilizando exclusivamente la respuesta del backend de PostgreSQL.
2.  **Seguridad y Escalabilidad:** Al utilizar la instancia de API base (`api.js`), la petición viaja automáticamente adjuntando el Token JWT (Bearers) mediante los interceptores configurados previamente.
3.  **Trazabilidad Continua:** Cualquier nueva incidencia reportada desde un celular o la web, impactará de inmediato el Dashboard en la próxima recarga, cerrando la brecha del ciclo de vida del dato.

## 3. Próximos Pasos (Deuda de Integración)
*   Implementar un protocolo de tiempo real (WebSockets/Socket.io) o *Polling* temporal para que el Dashboard se actualice sin necesidad de que el usuario presione el botón de recargar la página.
*   Conectar el manejo de errores de la API (Axios error catching) para redirigir directamente al usuario hacia las páginas globales de error 500 que se desarrollarán en tareas futuras.
