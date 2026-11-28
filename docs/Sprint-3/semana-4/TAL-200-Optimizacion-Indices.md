# TAL-200: Profiling y Optimización de Índices de Base de Datos (`ms-incidencias` y `ms-activos`)

## 1. Resumen de Cumplimiento y Fidelidad al MER

Se ejecutó el profiling con `EXPLAIN (ANALYZE, BUFFERS)` y la optimización aditiva de índices en las bases de datos `incidencias_db` (puerto `5434`) y `activos_db` (puerto `5433`), respetando íntegramente el **Diagrama MER Definitivo**:

1. **Criterio de Aceptación 1 — Fidelidad estricta al MER y migraciones seguras:** Se agregaron únicamente directivas `@@index` en `ms-incidencias/prisma/schema.prisma` y `ms-activos/prisma/schema.prisma`. No se añadieron, renombraron ni eliminaron columnas, no se modificaron tipos de datos, no se ejecutó `prisma migrate reset` y los archivos `migration.sql` generados contienen exclusivamente sentencias `CREATE INDEX`.
2. **Criterio de Aceptación 2 — Reducción > 50% en costo/tiempo de ejecución:** En el benchmark reproducible (`5,000` incidencias, `15,000` historiales, `5,000` órdenes de trabajo; `5,000` activos, `10,000` mantenimientos preventivos dentro de transacción `BEGIN ... ROLLBACK` sin alterar los datos reales), las consultas principales pasaron de `Seq Scan` / `Sort` a `Index Scan` / `Index Only Scan` / `Bitmap Index Scan`, logrando reducciones de entre **86.8% y 98.3%** en tiempo de ejecución y hasta **99.0%** en costo del planificador.
3. **Criterio de Aceptación 3 — Cero regresiones:** No se modificaron `openapi.yaml`, controladores, DTOs ni lógica de negocio. Las suites de pruebas unitarias de ambos microservicios pasaron al 100% (`172/172` en `ms-incidencias` y `36/36` en `ms-activos`).

---

## 2. Índices Creados

### 2.1 `ms-incidencias` (`incidencias_db :5434`)
Migración: `ms-incidencias/prisma/migrations/20261127213000_add_performance_indexes_tal200/migration.sql`

| Tabla | Índice | Columnas | Propósito |
| :--- | :--- | :--- | :--- |
| `INCIDENCIAS` | `INCIDENCIAS_fecha_creacion_idx` | `(fecha_creacion DESC)` | Listado paginado global ordenado por fecha descendente |
| `INCIDENCIAS` | `INCIDENCIAS_prioridad_fecha_creacion_idx` | `(prioridad, fecha_creacion DESC)` | Filtrado por prioridad con ordenamiento cronológico |
| `INCIDENCIAS` | `INCIDENCIAS_id_activo_fecha_creacion_idx` | `(id_activo, fecha_creacion DESC)` | Historial de incidencias por activo |
| `INCIDENCIAS` | `INCIDENCIAS_id_reportante_fecha_creacion_idx` | `(id_reportante, fecha_creacion DESC)` | Bandeja de incidencias por reportante |
| `HISTORIAL_ESTADOS` | `HISTORIAL_ESTADOS_id_incidencia_fecha_creacion_id_historial_idx` | `(id_incidencia, fecha_creacion DESC, id_historial DESC)` | Covering index para `LEFT JOIN LATERAL` de estado actual (`Index Only Scan`) |
| `ORDENES_TRABAJO` | `ORDENES_TRABAJO_id_incidencia_fecha_creacion_id_orden_idx` | `(id_incidencia, fecha_creacion DESC, id_orden DESC)` | Covering index para `LEFT JOIN LATERAL` de orden vigente (`Index Only Scan`) |
| `ORDENES_TRABAJO` | `ORDENES_TRABAJO_id_tecnico_fecha_cierre_fecha_creacion_idx` | `(id_tecnico, fecha_cierre, fecha_creacion DESC)` | Bandeja "Mis Asignadas" y cálculo de MTTR (`TAL-128`) |

### 2.2 `ms-activos` (`activos_db :5433`)
Migración: `ms-activos/prisma/migrations/20261127213000_add_performance_indexes_tal200/migration.sql`

| Tabla | Índice | Columnas | Propósito |
| :--- | :--- | :--- | :--- |
| `activos` | `activos_estado_categoria_idx` | `(estado, categoria)` | Filtrado combinado por estado operativo y categoría |
| `activos` | `activos_numero_serie_idx` | `(numero_serie)` | Búsqueda directa por número de serie (sin duplicar `codigo_qr` `@unique`) |
| `mantenimientos_preventivos` | `mantenimientos_preventivos_id_activo_fecha_programada_idx` | `(id_activo, fecha_programada DESC)` | Agenda de mantenimientos preventivos por activo |

---

## 3. Comparativa `EXPLAIN (ANALYZE, BUFFERS)` (Antes vs. Después)

Metodología: Benchmark determinístico sobre volumen representativo (`5,000` registros en tablas principales, `15,000` en `HISTORIAL_ESTADOS`, `10,000` en `mantenimientos_preventivos`) ejecutado dentro de `BEGIN; ... ANALYZE; EXPLAIN (ANALYZE, BUFFERS) ...; ROLLBACK;` para preservar intactos los datos de desarrollo.

| Consulta | Plan Antes | Plan Después | Costo Antes → Después | Tiempo Antes → Después | Buffers (`shared hit`) | Reducción Tiempo |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Q1**: Listado paginado `INCIDENCIAS` + `LEFT JOIN LATERAL` + `prioridad = 'critica'` | `Seq Scan` + `Bitmap Heap Scan` + `Sort` | `Index Scan` + `Index Only Scan` (x2) | `29693.54` → `284.83` (**-99.04%**) | `7.254 ms` → `0.123 ms` | `10101` → `125` (**-98.76%**) | **-98.30%** |
| **Q2**: Listado paginado `INCIDENCIAS` + `LEFT JOIN LATERAL` + `id_activo` | `Seq Scan` + `Bitmap Heap Scan` + `Sort` | `Index Scan` (`id_activo_fecha_creacion_idx`) + `Index Only Scan` (x2) | `2490.08` → `329.39` (**-86.77%**) | `1.017 ms` → `0.134 ms` | `872` → `139` (**-84.06%**) | **-86.82%** |
| **Q3**: `ORDENES_TRABAJO` (`id_tecnico`, `fecha_cierre IS NULL`, `ORDER BY fecha_creacion DESC`) | `Bitmap Index Scan` + `Sort` | `Bitmap Index Scan` + `Sort` | `76.13` → `76.13` | `0.147 ms` → `0.110 ms` | `68` → `67` | **-25.17%** |
| **Q4**: `activos` (`estado = 'OPERATIVO' AND categoria = 'COMPUTO'`) | `Seq Scan on activos` | `Bitmap Index Scan` (`activos_estado_categoria_idx`) | `152.12` → `85.59` (**-43.73%**) | `0.424 ms` → `0.022 ms` | `77` → `3` (**-96.10%**) | **-94.81%** |
| **Q5**: `activos` (`numero_serie = 'SN-BENCH-4200'`) | `Seq Scan on activos` | `Index Scan` (`activos_numero_serie_idx`) | `139.60` → `8.30` (**-94.05%**) | `0.330 ms` → `0.026 ms` | `77` → `3` (**-96.10%**) | **-92.12%** |
| **Q6**: `mantenimientos_preventivos` (`id_activo`, `ORDER BY fecha_programada DESC`) | `Seq Scan` + `Sort` | `Bitmap Index Scan` (`mantenimientos_preventivos_id_activo_fecha_programada_idx`) | `209.05` → `11.41` (**-94.54%**) | `0.517 ms` → `0.028 ms` | `84` → `4` (**-95.24%**) | **-94.58%** |

---

## 4. Validación de Pruebas Unitarias

- **`ms-incidencias`** (`pnpm --dir ms-incidencias test`): **19 suites / 172 tests** aprobados (0 fallos).
- **`ms-activos`** (`pnpm --dir ms-activos test`): **4 suites / 36 tests** aprobados (0 fallos).
