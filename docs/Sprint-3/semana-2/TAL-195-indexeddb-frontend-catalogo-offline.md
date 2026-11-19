# TAL-195: Implementación de IndexedDB en Frontend para Catálogo Offline

## 1. Información General
- **ID en Jira:** `TAL-195`
- **Responsable:** Benjamín Soto (`bsoto2025@alu.uct.cl`)
- **Rama de Desarrollo:** `feature/TAL-195-indexeddb-catalogo-offline`
- **Objetivo del Sprint 3 Relacionado:** Objetivo Específico 2 (*"Transformar la interfaz web en una Progressive Web App (PWA) con soporte offline real"*).
- **Dependencias:** `TAL-181` (*Manejador de Reconexión Automática y Reintento de Peticiones*).

---

## 2. Descripción Técnica de la Solución

### 2.1. Motor de Persistencia IndexedDB (`frontend-web/src/services/storage/offlineDb.js`)
Se implementó el servicio de almacenamiento local asíncrono basado en **IndexedDB** (`inframanager_offline_db`, versión `1`) con soporte nativo del navegador (`window.indexedDB`) y un motor compatible W3C en memoria (`createInMemoryIndexedDB`) para ejecución determinista en Node.js Test Runner y entornos restringidos.

El esquema define cuatro tiendas de objetos (*Object Stores*):
1. **`activos` (`keyPath: 'id'`):**
   - Índices: `codigoQr`, `categoria`, `estado`, `ubicacion`.
   - Almacena el catálogo de equipos e infraestructura institucional normalizando identificadores (`id`, `id_activo`, `codigoQr`) para búsquedas instantáneas sin conexión.
2. **`ordenes` (`keyPath: 'id'`):**
   - Índices: `id_incidencia`, `id_orden`, `id_tecnico`, `estado` (`estado_normalizado`), `id_activo`.
   - Almacena las órdenes de trabajo asignadas e incidencias operativas del técnico para consulta local y filtrado por técnico, activo o estado.
3. **`estados` (`keyPath: 'id'`):**
   - Índices: `tipo` (`'incidencia' | 'activo'`), `nombre_estado`.
   - Almacena el catálogo de estados de órdenes/incidencias y activos, incluyendo un catálogo institucional por defecto (`ESTADOS_CATALOGO_POR_DEFECTO`) y extracción automática de estados al sincronizar activos u órdenes.
4. **`cola_acciones` (`keyPath: 'id'`):**
   - Índices: `estado_sincronizacion`, `creado_en`, `endpoint`.
   - Permite encolar mutaciones (`POST`, `PUT`, `PATCH`, `DELETE`) realizadas cuando no hay conectividad (`encolarAccionOffline`), consultarlas en orden FIFO (`obtenerColaAccionesOffline`), actualizar su estado de sincronización (`actualizarEstadoAccionOffline`) y eliminarlas tras su confirmación (`eliminarAccionOffline`), habilitando la base directa para `TAL-196` (*Background Sync*) y `TAL-198` (*Vista Visual de Cola de Cambios Pendientes*).

### 2.2. Sincronización en Segundo Plano y Fallback Offline (`frontend-web/src/services/api.js`)
- **Escritura transparente en segundo plano (Criterio 1):** El interceptor de respuestas de Axios detecta respuestas `GET` exitosas hacia `/activos`, `/activos/:id`, `/incidencias`, `/ordenes-trabajo`, `/ordenes` y `/estados`, invocando asíncronamente `sincronizarRespuestaGetEnIndexedDB(response)` sin bloquear el hilo principal de renderizado.
- **Lectura de respaldo desde IndexedDB ante caída de red (Criterio 2):** Cuando una petición `GET` falla por pérdida de conexión o timeout (`isNetworkOrTimeoutError`) tras agotar la política de reintentos de `TAL-181`, `intentarLecturaOfflineDesdeIndexedDB(originalRequest)` recupera los registros desde IndexedDB y retorna una respuesta compatible con Axios (`status: 200`, `fromOfflineCache: true`, `headers['x-offline-source'] = 'indexeddb'`), evitando errores en las vistas `Inventario.jsx`, `Incidencias.jsx`, `Ordenes.jsx` y `DetalleOrden.jsx`.
- **Protección contra redirección errónea a `/500` en modo offline (`AxiosInterceptor.jsx`):** Cuando `navigator.onLine === false`, el interceptor global omite la redirección a la pantalla `/500` para permitir que el técnico continúe consultando el catálogo local.

### 2.3. Limpieza Segura al Cerrar Sesión (Criterio 3)
- Se integró `limpiarDatosOffline()` dentro de `limpiarSesion()` y `cerrarSesion()` en `frontend-web/src/services/authService.js`, en el botón de cierre de sesión de `frontend-web/src/components/Layout.jsx`, y en el flujo de expiración de sesión (`401`) de `frontend-web/src/services/api.js`, vaciando de forma atómica las tiendas `activos`, `ordenes`, `estados` y `cola_acciones` junto con los tokens de `localStorage`.

---

## 3. Verificación de Criterios de Aceptación

| # | Criterio de Aceptación (Jira) | Estado | Evidencia Técnica |
| :--- | :--- | :---: | :--- |
| **1** | Al navegar con internet, guarda en segundo plano el catálogo de activos y órdenes del técnico. | Cumplido | `sincronizarRespuestaGetEnIndexedDB` en `api.js` + `guardarActivosOffline` y `guardarOrdenesOffline` en `offlineDb.js`, validado en `offlineDb.test.mjs`. |
| **2** | Si se pierde la conexión, la aplicación lee los datos desde IndexedDB en lugar de arrojar error. | Cumplido | `intentarLecturaOfflineDesdeIndexedDB` en `api.js` + respaldos en `Inventario.jsx` e `Incidencias.jsx`, validado en `offlineDb.test.mjs`. |
| **3** | Limpieza segura de datos al cerrar sesión. | Cumplido | `limpiarDatosOffline()` integrado en `authService.js` (`limpiarSesion`, `cerrarSesion`), `Layout.jsx` y `api.js`, validado en `offlineDb.test.mjs`. |
