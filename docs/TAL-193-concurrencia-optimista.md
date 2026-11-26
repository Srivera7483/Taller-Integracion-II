# TAL-193: Resolución de Conflictos de Concurrencia Optimista (Sin Alterar el MER)

## 1. Objetivo y Restricción Arquitectónica

Implementar control de concurrencia optimista en `ms-incidencias` para prevenir que actualizaciones tardías o sincronizaciones offline sobrescriban cambios más recientes en órdenes de trabajo e incidencias, **respetando estrictamente el Diagrama MER Definitivo** (sin agregar columnas ni migraciones SQL fuera del modelo oficial).

## 2. Mecanismo Implementado sobre Columnas Existentes del MER

1. **Cierre y actualización de diagnóstico (`PATCH /api/v1/ordenes-trabajo/:id_orden/diagnostico`)**
   - `ActualizarDiagnosticoDto` incorpora el campo opcional `fecha_referencia` (ISO-8601), manteniendo 100 % de retrocompatibilidad con clientes que no lo envíen.
   - `OrdenesTrabajoService.actualizarDiagnostico` evalúa `ORDENES_TRABAJO.fecha_cierre` y el último registro en `HISTORIAL_ESTADOS`:
     - Si la orden ya fue cerrada o la incidencia está en estado terminal (`Resuelta`, `Completada`, `Cerrada`, `Rechazada`, `Cancelada`), responde **HTTP 409 Conflict** con el detalle `estado_servidor`.
     - Si `fecha_referencia` es anterior a la última actualización registrada en servidor, responde **HTTP 409 Conflict** con `codigo: "CONFLICTO_CONCURRENCIA"` y el snapshot vigente del servidor (`estado_servidor`).

2. **Sincronización masiva offline (`POST /api/v1/sincronizacion/lote`)**
   - `SincronizacionService.ejecutarActualizarEstado` compara `accion.timestamp_local` contra la `fecha_creacion` del registro más reciente en `HISTORIAL_ESTADOS`.
   - Si el servidor registra una transición posterior, aísla el conflicto (HTTP 409 en el detalle del ítem dentro del `207 Multi-Status`) sin sobrescribir el estado más reciente ni revertir las demás acciones válidas del lote.

## 3. Verificación

- `ms-incidencias/prisma/schema.prisma`: **sin cambios** respecto al MER oficial.
- Pruebas unitarias en `ordenes-trabajo.service.spec.ts` y `sincronizacion.service.spec.ts` cubriendo detección de conflictos 409 y actualizaciones válidas.
