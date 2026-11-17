# TAL-194: Implementación de Clasificación de Prioridad y Resolución de Incidencias con RBAC

## 1. Diagnóstico y Contexto del Requerimiento

En las iteraciones previas del sistema (Sprint 1 y 2), la prioridad de las incidencias operaba de manera puramente virtual y dinámica en memoria mediante el servicio `PrioridadDinamicaService` (cálculo de horas de inactividad) o mediante almacenamiento volátil en cookies del cliente web (`incidenciasStorage.js`). Esto impedía que los supervisores o administradores asignaran una prioridad manual y oficial con persistencia en base de datos. De manera similar, la resolución y diagnóstico técnico dependían de simulaciones locales en lugar de impactar de forma persistente a PostgreSQL y actualizar los historiales oficiales.

El objetivo de **TAL-194** es completar el ciclo de vida operativo de las incidencias:
1. Habilitar la **Clasificación de Prioridad** (`Baja`, `Media`, `Alta`, `Crítica`) con persistencia real en PostgreSQL en la entidad `INCIDENCIAS`, asegurada mediante control de acceso RBAC por permisos granulares (`incidencias:clasificar_prioridad`) para roles autorizados (`SUPERVISOR` y `ADMINISTRADOR`).
2. Habilitar la **Resolución y Cierre de Incidencias** en PostgreSQL (`PATCH /api/v1/incidencias/:id/resolver`), registrando el cambio de estado en `HISTORIAL_ESTADOS` y la `fecha_cierre` en `ORDENES_TRABAJO` para técnicos asignados, supervisores o administradores (`incidencias:resolver`).
3. Registrar diagnósticos técnicos reales en PostgreSQL mediante `PATCH /api/v1/ordenes-trabajo/:id/diagnostico`.
4. **Desacoplar y eliminar completamente** el uso de `incidenciasStorage.js` (cookies / localStorage) para estados, prioridades y cierres de incidencias en las vistas principales (`DetalleIncidencia.jsx`, `DetalleOrden.jsx` y `ModalCierreMantenimiento.jsx`).

---

## 2. Resumen Detallado de Archivos Creados y Modificados (El "Por Qué")

| Componente / Archivo | Tipo | ¿Qué se añadió o cambió? | ¿Por qué se hizo? (Justificación Técnica) |
|---|---|---|---|
| `ms-incidencias/prisma/schema.prisma` | **Modificado** | 1. Inclusión del valor `critica` en el enum `PrioridadIncidencia`.<br/>2. Adición del campo `fecha_cierre DateTime? @db.Timestamp()` en `OrdenTrabajo`. | **Persistencia Real**: Cumple los Criterios 1 y 2 al dotar a PostgreSQL de los campos necesarios para almacenar la prioridad oficial y la marca de tiempo de cierre de la orden de trabajo. |
| `ms-incidencias/prisma/migrations/20261109170000_tal_194_prioridad_y_cierre/migration.sql` | **Nuevo Archivo** | Script SQL de migración idempotente (`ALTER TYPE`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`). | **Evolución de BD**: Permite aplicar las columnas y enums en entornos de despliegue y contenedores Docker sin pérdida de datos. |
| `ms-incidencias/src/incidencias/dto/clasificar-prioridad.dto.ts` | **Nuevo Archivo** | DTO con validadores de `class-validator` para validar el cuerpo de la petición de clasificación de prioridad. | **Validación de Entradas**: Garantiza que únicamente se reciban valores de texto no vacíos antes de llegar a la capa de servicio. |
| `ms-incidencias/src/incidencias/incidencias.controller.ts` | **Modificado** | 1. Inclusión de `PermissionsGuard` a nivel de controlador.<br/>2. Nuevo endpoint `PATCH /incidencias/:id_incidencia/prioridad` con roles `SUPERVISOR`/`ADMINISTRADOR` y permiso `incidencias:clasificar_prioridad`.<br/>3. Actualización de `PATCH /incidencias/:id_incidencia/resolver` para soportar roles `TECNICO`, `SUPERVISOR`, `ADMINISTRADOR` y permiso `incidencias:resolver`. | **RBAC y Exposición de Endpoints**: Protege las operaciones críticas en base a la matriz de permisos de TAL-97 y desacopla la lógica del cliente. |
| `ms-incidencias/src/incidencias/incidencias.service.ts` | **Modificado** | 1. Método `clasificarPrioridad` con normalización case-insensitive (`Baja`, `Media`, `Alta`, `Crítica`).<br/>2. Actualización de `resolverIncidencia` para soportar `SUPERVISOR`/`ADMINISTRADOR` y actualizar `fecha_cierre` en `ordenTrabajo`. | **Integridad Transaccional**: Realiza el cambio de estado y el cierre de la orden dentro de una transacción Prisma (`$transaction`). |
| `ms-incidencias/src/ordenes-trabajo/ordenes-trabajo.service.ts` | **Modificado** | Actualización de `actualizarDiagnostico` para permitir que supervisores y administradores registren o corrijan diagnósticos además del técnico asignado. | **Flexibilidad Operativa**: Evita bloqueos cuando un supervisor debe cerrar o diagnosticar una orden en ausencia del técnico. |
| `ms-incidencias/src/ordenes-trabajo/ordenes-trabajo.controller.ts` | **Modificado** | Inyección de `rolUsuario` desde el decorador `@CurrentUser` hacia el servicio de órdenes. | **Propagación de Identidad**: Permite evaluar el rol en la capa de negocio. |
| `ms-incidencias/src/incidencias/incidencias.controller.spec.ts` | **Modificado** | 2 nuevas pruebas unitarias para `clasificarPrioridad` y `resolverIncidencia` con TAL-194. | **Aseguramiento de Calidad**: Cobertura de pruebas unitarias sobre los nuevos métodos del controlador. |
| `frontend-web/src/views/DetalleIncidencia.jsx` | **Modificado** | 1. Eliminación de lectura de `incidenciasStorage.js` para estado y prioridad.<br/>2. Selector interactivo de prioridad visible para usuarios con permiso `incidencias:clasificar_prioridad` / Supervisor / Admin.<br/>3. Botón de resolución directa y conexión con API real mediante `api.patch`. | **Cierre del Ciclo de Vida**: Conexión con PostgreSQL real y eliminación de mocks locales. |
| `frontend-web/src/views/DetalleOrden.jsx` | **Modificado** | Carga directa de la orden desde el API Gateway (`api.get('/ordenes-trabajo/' + id)`) eliminando el fallback de incidencias locales. | **Persistencia Centralizada**: Garantiza que la orden refleje los datos reales de la BD. |
| `frontend-web/src/components/ModalCierreMantenimiento.jsx` | **Modificado** | Reemplazo de funciones mock `completarMantenimientoTecnico` y `rechazarIncidenciaTecnico` por llamadas directas a `api.patch('/incidencias/:id/resolver')`, `/estado` y `/ordenes-trabajo/:id/diagnostico`. | **Cumplimiento de Criterio 3**: Eliminación total del guardado en cookies/localStorage durante el cierre técnico. |
| `docs/TAL-194-clasificacion-prioridad-resolucion-incidencias-rbac.md` | **Nuevo Archivo** | Documentación técnica completa de la tarea TAL-194. | **Trazabilidad y Auditoría**: Respaldo para el Scrum Master y revisión de código. |

---

## 3. Especificación de Endpoints y Contratos HTTP

### A. Clasificación de Prioridad
- **Método**: `PATCH`
- **Ruta**: `/api/v1/incidencias/:id_incidencia/prioridad`
- **Permiso Requerido**: `incidencias:clasificar_prioridad`
- **Roles Permitidos**: `SUPERVISOR`, `ADMINISTRADOR`

**Payload**:
```json
{
  "prioridad": "Alta"
}
```
*Valores permitidos:* `Baja`, `Media`, `Alta`, `Crítica` (insensible a mayúsculas/minúsculas).

**Respuesta Exitosa (HTTP 200 OK)**:
Retorna el objeto completo de la incidencia con el campo `prioridad` actualizado en PostgreSQL.

---

### B. Marcación de Incidencia como Resuelta
- **Método**: `PATCH`
- **Ruta**: `/api/v1/incidencias/:id_incidencia/resolver`
- **Permiso Requerido**: `incidencias:resolver`
- **Roles Permitidos**: `TECNICO`, `SUPERVISOR`, `ADMINISTRADOR`

**Comportamiento en Base de Datos**:
1. Valida que la incidencia se encuentre en estado `ASIGNADA`.
2. Inserta un nuevo registro en `HISTORIAL_ESTADOS` con el estado `Resuelta`.
3. Actualiza el campo `fecha_cierre = NOW()` en la tabla `ORDENES_TRABAJO` para la incidencia asociada.
4. Emite notificación por correo al usuario reportante.

---

### C. Actualización de Diagnóstico Técnico
- **Método**: `PATCH`
- **Ruta**: `/api/v1/ordenes-trabajo/:id_orden/diagnostico`
- **Permiso Requerido**: `ordenes:diagnosticar`
- **Roles Permitidos**: `TECNICO`, `SUPERVISOR`, `ADMINISTRADOR`

**Payload**:
```json
{
  "diagnostico_tecnico": "Se reemplazó cable UTP y se reconfiguró la boca de red en el patch panel."
}
```

---

## 4. Resultados de Compilación y Pruebas Automatizadas

### Backend (`ms-incidencias`)
- **Compilación TypeScript (`nest build`)**: Exitosa, **0 errores**.
- **Pruebas Automatizadas (Jest)**:
  - **Suites de pruebas**: **14 pasadas de 14 totales (100%)**.
  - **Total de pruebas unitarias**: **109 pasadas de 109 totales (100%)**.
  - Pruebas de TAL-194 en `incidencias.controller.spec.ts`: **PASS** (10 de 10 pruebas pasadas).

### Frontend (`frontend-web`)
- **Compilación de Producción (`vite build`)**: Exitosa, **0 errores**, bundle generado en 1.41s.
- **Pruebas Unitarias (`node --test`)**: **15 pasadas de 15 totales (100%)**.

