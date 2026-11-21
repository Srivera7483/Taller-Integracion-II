# TAL-193: Resolución de Conflictos de Concurrencia Optimista (Versionado)

## Resumen Técnico

Esta tarea implementa control de concurrencia optimista para las Órdenes de Trabajo en el microservicio `ms-incidencias`, previniendo que dos técnicos sobrescriban accidentalmente el estado de una misma orden cuando uno de ellos estuvo trabajando sin conexión (offline).## Cambios Realizados

### 1. Schema Prisma
- Agregado `version Int @default(1)` al modelo `OrdenTrabajo` en `prisma/schema.prisma`
- Migraci�n `20261120140000_add_version_to_orden_trabajo` aplicada a PostgreSQL

### 2. DTOs Actualizados
- `crear-orden-trabajo.dto.ts`: Agregado `@IsInt()` y `@Min(1)` para `version`
- `actualizar-diagnostico.dto.ts`: Agregado `@IsInt()` y `@Min(1)` para `version`
- `sync-action.dto.ts`: Agregado campo opcional `version?: number`

