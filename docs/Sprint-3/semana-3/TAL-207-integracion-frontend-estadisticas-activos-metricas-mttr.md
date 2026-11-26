# TAL-207: Integración Frontend de Estadísticas de Activos (TAL-6) y Métricas MTTR de Resolución (TAL-128)

## 1. Información General
- **ID en Jira:** `TAL-207`
- **Responsable:** Benjamín Soto (`bsoto2025@alu.uct.cl`)
- **Rama de Desarrollo:** `feature/TAL-207-estadisticas-activos-metricas-mttr`
- **Dependencias:** `TAL-6` (`GET /api/v1/activos/estadisticas`), `TAL-128` (`GET /api/v1/estadisticas/tiempo-resolucion`), `TAL-97` (RBAC).

---

## 2. Cobertura de Incoherencias Arquitectónicas y Alineación con Diagramas

Sin modificar código ni bases de datos de los microservicios desarrollados por otros integrantes del equipo (`ms-auth`, `ms-activos`, `ms-incidencias`, `api gateway`), la capa de servicio `estadisticasService.js` absorbe y resuelve todas las fricciones detectadas:

1. **Alineación con el nuevo Diagrama de Casos de Uso (`Visualizar métricas y KPIs`):**
   - En el Diagrama de Casos de Uso actualizado, tanto **Visualizar métricas y KPIs** como **Consultar Activos** corresponden exclusivamente al actor **Administrador** (coincidiendo además con el Criterio 3 de `TAL-128`).
   - `puedeVisualizarMetricasKpis()` exige simultáneamente el permiso granular `estadisticas:ver` y el rol `ADMINISTRADOR`, evitando exponer KPIs o generar peticiones `403 Forbidden` en sesiones de `SUPERVISOR`, `TECNICO` o `REPORTANTE` sin alterar `ms-auth/prisma/seed.cjs`.
2. **Alineación con el nuevo Diagrama de Software (`Proxy /incidencias` + PWA Offline):**
   - `fetchMetricasTiempoResolucion()` consulta `GET /api/v1/estadisticas/tiempo-resolucion` y aplica fallback inmediato ante `404` hacia `GET /api/v1/incidencias/estadisticas/tiempo-resolucion` (ruta enrutada por el proxy `/incidencias` del API Gateway en el Diagrama de Software).
   - Si ambas rutas responden `404` (por ejemplo, antes de fusionarse el PR de `TAL-128` en `dev`), sintetiza de respaldo los indicadores desde `/incidencias?limite=50` respetando el **Diagrama MER** (`HISTORIAL_ESTADOS` en estado `"Resuelta"` frente a `ORDENES_TRABAJO.fecha_creacion`, sin requerir una columna `fecha_cierre` inexistente en el MER).
   - Ante desconexión de red (`PWA Offline`), ambos paneles reconstruyen sus métricas desde **IndexedDB** (`obtenerActivosOffline` y `obtenerOrdenesOffline` de `TAL-195`).
3. **Compatibilidad Dual con Contrato OpenAPI (`snake_case` y `camelCase`) y MER:**
   - Los normalizadores aceptan indistintamente propiedades en `camelCase` (`totalActivos`, `promedioHorasTotal`) y `snake_case` (`total_activos`, `promedio_horas_total`), mapas planos o arreglos relacionales del MER (`EDIFICIOS`, `UBICACIONES`, `CATEGORIAS`), y calculan automáticamente la `tasaResolucion` porcentual omitida en el payload base de `TAL-128`.

---

## 3. Verificación de Criterios de Aceptación

| # | Criterio de Aceptación (Jira) | Estado | Evidencia Técnica |
| :--- | :--- | :---: | :--- |
| **1** | El frontend consume en tiempo real `GET /api/v1/activos/estadisticas` (`TAL-6`) y renderiza las métricas de inventario por categoría y ubicación. | Cumplido | `fetchEstadisticasActivos` + bloque de inventario en `PanelEstadisticasAnalitica.jsx`, integrado en `Dashboard.jsx` e `Inventario.jsx`. |
| **2** | El frontend consume `GET /api/v1/estadisticas/tiempo-resolucion` (`TAL-128`) y visualiza el KPI de tiempo promedio de resolución (MTTR) y su desglose. | Cumplido | `fetchMetricasTiempoResolucion` + tarjetas de MTTR, tasa de resolución y barras comparativas por técnico y por activo en `PanelEstadisticasAnalitica.jsx`. |
| **3** | Incluye manejo de estados de carga, datos vacíos y control de acceso RBAC (visible según permisos del rol). | Cumplido | `EsqueletoTarjeta`, estados vacíos sin `NaN` y `puedeVisualizarMetricasKpis` alineado al Diagrama de Casos de Uso (`ADMINISTRADOR` + `estadisticas:ver`). |
