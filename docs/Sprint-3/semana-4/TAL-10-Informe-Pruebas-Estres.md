# TAL-10: Pruebas de Estrés y Optimización de Concurrencia

## Resumen Ejecutivo

Se implementó y ejecutó la suite de pruebas de estrés y contención perimetral de `TAL-10` sobre el **API Gateway (`:3000`)** y los microservicios **`ms-auth` (`:3001`)**, **`ms-incidencias` (`:3002`)**, **`ms-activos` (`:3003`)** y **`ms-notificaciones` (`:3004`)**, junto a la infraestructura Docker (`auth_db`, `activos_db`, `incidencias_db`, `rabbitmq` y `redis`).

### Verificación Explícita de los 3 Criterios de Aceptación

1. **Contención anti-fuerza bruta (`429 Too Many Requests`):** Validado mediante `tests/load/artillery-rate-limit.yml` sobre `POST /api/v1/auth/login` y `POST /api/v1/autenticacion/inicio-sesion`. Las primeras peticiones pasaron a `ms-auth` (`HTTP 401`, 9 respuestas) y las excedentes al umbral de `max: 5` / 15 min por IP fueron bloqueadas perimetralmente por el API Gateway (`HTTP 429`, 11 respuestas) con `median = 1 ms` y `0` errores `502`/`5xx`.
2. **Concurrencia sostenida a 50 req/s sin caídas (`0` `502`/OOM):** Validado mediante `tests/load/artillery-concurrencia-50rps.yml` (warmup `10 -> 50 req/s` en 5 s + ráfaga sostenida de `50 req/s` durante 20 s). Se completaron **1,150 de 1,150** VUs con **0 VUs fallidos** (`vusers.failed = 0`), **0 errores `502 Bad Gateway`**, y **0 caídas o reinicios OOM** en los contenedores Docker (`98.96%` de respuestas 2xx en la corrida de verificación y `100%` en la corrida base). *(Nota: durante la ráfaga de 50 req/s el script `load-tests-starter.ps1` eleva temporalmente `RATE_LIMIT_GLOBAL_MAX=100000` en memoria para medir PostgreSQL y RabbitMQ sin falsos `429` globales, restaurando inmediatamente el valor por defecto `300` al finalizar).*
3. **Insumo técnico de índices para `TAL-200`:** Se diagnosticaron las consultas Prisma/SQL de `incidencias_db` y `activos_db` bajo carga concurrente y se definieron los índices compuestos recomendados para `TAL-200`.

---

## Configuración de Escenarios Artillery y Reproducción

### Archivos Implementados

- `tests/load/load-tests-starter.ps1`: Script lanzador que reinicia temporalmente el API Gateway (`:3000`) con `RATE_LIMIT_GLOBAL_MAX=100000` en memoria, ejecuta `run-load-tests.ps1` y restaura el Gateway con su configuración original (`300 req / 15 min`) mediante bloque `try / finally`, validando `/health` al cierre.
- `tests/load/run-load-tests.ps1`: Script reproducible que verifica `http://localhost:3000/health`, captura `docker stats --no-stream` y el estado de las colas RabbitMQ (`incidencias_criticas` e `incidencias_criticas.dlq`) antes y después, obtiene el JWT único y ejecuta ambos escenarios guardando reportes en `tests/load/reports/`.
- `tests/load/artillery-rate-limit.yml`: Ráfaga de 20 peticiones (`4 req/s` durante 5 s) repartida entre `POST /api/v1/auth/login` y `POST /api/v1/autenticacion/inicio-sesion` con credenciales inválidas.
- `tests/load/artillery-concurrencia-50rps.yml` y `tests/load/processor.js`: Escenario de carga mixta a `50 req/s` con JWT único del usuario seed (`reportante@uct.cl`) distribuido en:
  - **30%** `POST /api/v1/incidencias` (escritura en `incidencias_db` + publicación en RabbitMQ para prioridades críticas).
  - **40%** `GET /api/v1/incidencias?page=1&limit=10` (lectura paginada con `LEFT JOIN LATERAL` en `incidencias_db`).
  - **30%** `GET /api/v1/activos/validar-qr?codigoQr=...` (validación de QR contra `activos_db` usando códigos seed `UCT-PRJ-01`..`UCT-PC-01`).

### Comandos de Reproducción

```powershell
# Ejecución automatizada completa (ajusta y restaura RATE_LIMIT_GLOBAL_MAX automáticamente)
powershell -ExecutionPolicy Bypass -File tests/load/load-tests-starter.ps1

# Ejecución directa sobre Gateway ya configurado
powershell -ExecutionPolicy Bypass -File tests/load/run-load-tests.ps1

# Ejecución individual con Artillery
npx --yes artillery run --output tests/load/reports/concurrencia-50rps.json tests/load/artillery-concurrencia-50rps.yml
npx --yes artillery run --output tests/load/reports/rate-limit.json tests/load/artillery-rate-limit.yml
```

---

## Métricas Reales Obtenidas

### 1. Escenario de Concurrencia Sostenida (`50 req/s`)

| Métrica | Corrida Inicial | Corrida Verificación (`load-tests-starter.ps1`) |
|---|---|---|
| Total de requests (`http.requests`) | **1,150** | **1,150** |
| VUs completados / fallidos | **1,150** / **0** | **1,150** / **0** |
| Distribución por flujo | `GET /incidencias`: 436 · `POST /incidencias`: 363 · `GET /activos/validar-qr`: 351 | `GET /incidencias`: 452 · `POST /incidencias`: 356 · `GET /activos/validar-qr`: 342 |
| Throughput pico en fase sostenida | **50 req/s** | **50 req/s** |
| Códigos HTTP | `200 OK`: **787** · `201 Created`: **363** · `500`: **0** · `502`: **0** | `200 OK`: **794** · `201 Created`: **344** · `500`: **12** (timeout inter-servicio ~2,008 ms) · `502`: **0** |
| Latencia `min` / `median (p50)` | **2 ms** / **19.9 ms** | **2 ms** / **16 ms** |
| Latencia `mean` | **1,013.1 ms** | **1,009.6 ms** |
| Latencia `p95` / `p99` / `max` | **3,011.6 ms** / **3,072.4 ms** / **3,130 ms** | **3,011.6 ms** / **3,011.6 ms** / **4,273 ms** |

### 2. Escenario Anti-Fuerza Bruta (`Rate Limit`)

| Métrica | Valor Observado |
|---|---|
| Total de requests (`http.requests`) | **20** (`4 req/s` durante 5 s; 12 en `/auth/login` y 8 en `/autenticacion/inicio-sesion`) |
| Códigos HTTP | `401 Unauthorized`: **9** · `429 Too Many Requests`: **11** · `502`/`5xx`: **0** |
| Latencia `min` / `median (p50)` | **0 ms** / **1 ms** |
| Latencia `mean` | **43.3 ms – 46 ms** |
| Latencia `p95` / `p99` / `max` | **111.1 ms – 117.9 ms** / **111.1 ms – 117.9 ms** / **118 ms – 120 ms** |

### 3. Uso de Recursos Docker (Antes vs. Después)

| Contenedor | CPU % (Antes -> Después) | Memoria (Antes -> Después) |
|---|---|---|
| `ms-notificaciones` | `0.02%` -> `0.00%` | `54.74 MiB` -> `54.74 MiB` (`0.71%`) |
| `auth_db` | `0.00%` -> `0.00%` | `38.80 MiB` -> `38.80 MiB` (`0.50%`) |
| `rabbitmq` | `0.43%` -> `0.44%` (pico drenado `241.51%`) | `174.3 MiB` -> `174.3 MiB` (`2.25%`) |
| `incidencias_db` | `0.00%` -> `0.00%` | `53.97 MiB` -> `45.45 MiB` (`0.59%`) |
| `activos_db` | `0.00%` -> `0.00%` | `71.16 MiB` -> `71.67 MiB` (`0.92%`) |
| `redis` | `0.32%` -> `0.32%` | `7.359 MiB` -> `7.367 MiB` (`0.10%`) |

### 4. Estado de Colas RabbitMQ

| Cola | Antes (`Messages` / `Consumers` / `State`) | Después (`Messages` / `Consumers` / `State`) |
|---|---|---|
| `incidencias_criticas` | `0` / `1` / `running` | `0` / `1` / `running` |
| `incidencias_criticas.dlq` | `0` / `0` / `running` | `0` / `0` / `running` |

Todos los eventos críticos generados durante la ráfaga de `POST /api/v1/incidencias` fueron consumidos en tiempo real por `ms-notificaciones` sin acumulación de backlog ni envíos a la Dead-Letter Queue (`incidencias_criticas.dlq = 0`).

---

## Diagnóstico de Cuellos de Botella e Índices Recomendados para `TAL-200`

### Hallazgos en Consultas Prisma/PostgreSQL

1. **Distribución bimodal de latencia (`p50 = 16–19.9 ms` vs. `p95 = 3,011.6 ms`):**
   - Las lecturas simples de `GET /api/v1/activos/validar-qr` sobre `activos_db` responden en milisegundos gracias al índice único `activos_codigo_qr_key` (`@unique` en `codigo_qr`).
   - En contraste, `ms-incidencias/src/incidencias/incidencias.service.ts` (`listar`) ejecuta una consulta SQL con doble `LEFT JOIN LATERAL` y ordenamiento `ORDER BY i."fecha_creacion" DESC LIMIT ... OFFSET ...`:
     - La tabla `"INCIDENCIAS"` **carece de índices** sobre `fecha_creacion`, `id_activo` e `id_reportante`, obligando a un *Sequential Scan + Sort* a medida que crece la tabla.
     - `"HISTORIAL_ESTADOS"` solo posee `@@index([id_incidencia])` y `@@index([id_estado])`, por lo que `ORDER BY h."fecha_creacion" DESC, h."id_historial" DESC LIMIT 1` dentro del `LATERAL` requiere reordenar registros por cada incidencia evaluada.
     - `"ORDENES_TRABAJO"` solo posee `@@index([id_incidencia])` y `@@index([id_tecnico])`, generando el mismo costo de ordenamiento en `ORDER BY o."fecha_creacion" DESC, o."id_orden" DESC LIMIT 1`.
2. **Contención síncrona inter-servicio en ráfaga de escrituras (`POST /api/v1/incidencias`):**
   - `POST /api/v1/incidencias` realiza validaciones HTTP internas con timeout (`1,500–2,000 ms`) hacia `ms-activos` / `ms-auth` antes de insertar y publicar en RabbitMQ; durante el arranque brusco de `50 req/s` (`Warmup`), 12 peticiones alcanzaron el timeout de `~2,008 ms` (`HTTP 500`), lo que refuerza la necesidad de optimizar las consultas de lectura con índices compuestos en `TAL-200` y ampliar el `connection_limit` de Prisma en producción.

### Índices Compuestos Recomendados para `TAL-200`

1. **`incidencias_db` (`ms-incidencias/prisma/schema.prisma`):**
   - `Incidencias`:
     - `@@index([fecha_creacion(sort: Desc)])` — acelera el listado paginado principal (`GET /api/v1/incidencias`).
     - `@@index([id_activo, fecha_creacion(sort: Desc)])` — optimiza filtros por activo ordenados por fecha.
     - `@@index([id_reportante, fecha_creacion(sort: Desc)])` — optimiza filtros por reportante ordenados por fecha.
   - `HistorialEstados`:
     - `@@index([id_incidencia, fecha_creacion(sort: Desc), id_historial(sort: Desc)])` — elimina el *Sort* interno en el `LEFT JOIN LATERAL` de estado actual.
   - `OrdenTrabajo`:
     - `@@index([id_incidencia, fecha_creacion(sort: Desc), id_orden(sort: Desc)])` — elimina el *Sort* interno en el `LEFT JOIN LATERAL` de última orden asignada.
     - `@@index([id_tecnico, fecha_cierre])` — optimiza la consulta de disponibilidad y órdenes abiertas por técnico.

2. **`activos_db` (`ms-activos/prisma/schema.prisma`):**
   - `Activo`:
     - `@@index([estado, categoria])` — optimiza el cálculo de estadísticas y listados filtrados en `ms-activos`.
   - `Mantenimiento`:
     - `@@index([id_activo, fecha_programada(sort: Desc)])` — acelera la trazabilidad de mantenimientos preventivos por activo.
