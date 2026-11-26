# TAL-222: Adecuaciones de PBAC y Frontend Pendientes

## Resumen de Cambios

Se implementaron en orden de prioridad las 5 adecuaciones transversales solicitadas en `TAL-222`, alineando `ms-auth`, `ms-incidencias`, `ms-activos` y `frontend-web` con el **Diagrama de Casos de Uso aprobado**, el **Diagrama de Software** y el contrato **`openapi.yaml` (`v1.5.0`)**:

1. **Matriz de permisos PBAC 1:1 con el Diagrama de Casos de Uso (`ms-auth/prisma/seed.cjs` + `frontend-web`):**
   - Se incorporaron los permisos granulares `reportes:exportar` y `usuarios:ver` al catálogo de `PERMISOS`.
   - `REPORTANTE`: `incidencias:crear`, `incidencias:ver`, `evidencias:subir`.
   - `TECNICO`: `incidencias:crear`, `incidencias:ver`, `incidencias:resolver`, `evidencias:subir`, `ordenes:diagnosticar` *(se retiró `mantenimientos:crear` y se agregó `incidencias:crear`)*.
   - `SUPERVISOR`: `incidencias:crear`, `incidencias:ver`, `incidencias:clasificar_prioridad`, `evidencias:subir`, `ordenes:asignar`, `mantenimientos:crear`, `usuarios:ver` *(se retiraron permisos de resolución, diagnóstico, gestión de activos y KPIs)*.
   - `ADMINISTRADOR`: `incidencias:ver`, `activos:gestionar`, `estadisticas:ver`, `reportes:exportar`, `usuarios:ver`, `usuarios:gestionar`.
   - En `frontend-web`, se reemplazaron los controles por nombre de rol en `Layout.jsx`, `Dashboard.jsx`, `Incidencias.jsx`, `DetalleIncidencia.jsx` y `ModalCierreMantenimiento.jsx` por validaciones `hasPermission(...)`.

2. **Eliminación del flujo «Aprobar resolución»:**
   - Se eliminó el componente `frontend-web/src/components/AprobacionReportante.jsx` y su montaje/handler en `DetalleIncidencia.jsx`.
   - En `ms-incidencias/src/incidencias/incidencias.service.ts`, se bloqueó explícitamente la transición heredada desde `Resuelta (3)` hacia `Cerrada (4)` / `Rechazada (5)` por parte del reportante, preservando intacto el flujo técnico de resolución y diagnóstico.

3. **Notificaciones de prioridad dinámica en RabbitMQ sin duplicados (`uct.activos.events`):**
   - Se incorporó `emitirCambioPrioridadDinamica(...)` en `ms-incidencias/src/rabbitmq/rabbitmq-producer.service.ts` publicando sobre el exchange topic `uct.activos.events` con routing key `notificacion.prioridad.escalada` y payload compatible con `NotificacionEventoDto` de `ms-notificaciones`.
   - Se implementó `PrioridadDinamicaMonitorService` (`ms-incidencias/src/incidencias/prioridad-dinamica-monitor.service.ts`), el cual evalúa periódicamente las incidencias activas con `PrioridadDinamicaService` y publica únicamente cuando existe un cambio efectivo de prioridad por antigüedad (evitando emisiones duplicadas para el mismo nivel o incidencias terminales/ya críticas).

4. **Refactorización pura a PBAC (retiro de `@Roles`):**
   - Verificada la cobertura de `@RequirePermissions` en todos los endpoints protegidos, se retiraron todos los decoradores `@Roles(...)` y `RolesGuard` de `AuthController`, `IncidenciasController`, `EstadisticasController` y `OrdenesTrabajoController`, operando exclusivamente con `JwtAuthGuard` y `PermissionsGuard`.

5. **Limpieza de interfaz e identificación visual de roles (`ad26d47`):**
   - Integrado el commit previo `ad26d47` que elimina el indicador «En vivo» en `Dashboard.jsx` y aplica colores distintivos por rol al perfil del usuario en `Layout.jsx`.

## Validación y Pruebas de Regresión

- `ms-auth`: build + pruebas unitarias (`vitest`), incluyendo verificación de metadatos PBAC sin `@Roles`.
- `ms-incidencias`: build + pruebas unitarias (`jest`), incluyendo `prioridad-dinamica-monitor.service.spec.ts`, eliminación del flujo de aprobación y verificación de metadatos PBAC en los 3 controladores.
- `ms-activos`: build + pruebas unitarias (`jest`).
- `frontend-web`: pruebas unitarias (`pnpm run test:unit`) + compilación de producción (`pnpm run build`).
