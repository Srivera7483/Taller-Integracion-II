# TAL-192: Endpoint de Sincronización Masiva en Lote para Datos Offline

## 1. Resumen Técnico

Se implementó el endpoint `POST /api/v1/sincronizacion/lote` en el microservicio `ms-incidencias`, expuesto a través del API Gateway. Permite a las aplicaciones clientes enviar un lote de acciones realizadas sin conexión en una sola llamada HTTP, con procesamiento de fallo parcial aislado y reporte detallado por operación.

### Archivos creados

| Archivo | Propósito |
|---|---|
| `ms-incidencias/src/sincronizacion/sincronizacion.types.ts` | Tipos compartidos: `EstadoItemSincronizacion`, `ItemResultadoSincronizacion`, `ResultadoLoteSincronizacion`, mapeo `tipo → permiso` (catálogo TAL-97) y tipos de acción válidos. |
| `ms-incidencias/src/sincronizacion/dto/sync-action.dto.ts` | DTO `SyncActionDto`: valida `id_accion_local`, `tipo` (`@IsIn`), `payload` (`@IsObject` opcional), `timestamp_local` (`@IsISO8601` strict). |
| `ms-incidencias/src/sincronizacion/dto/batch-sync.dto.ts` | DTO `BatchSyncDto`: valida arreglo `acciones` con `@ArrayMinSize(1)` y `@ArrayMaxSize(50)`, `@ValidateNested` + `@Type` para anidación. |
| `ms-incidencias/src/sincronizacion/dto/sync-resultado.dto.ts` | DTOs de respuesta: `ItemResultadoDto`, `ResumenLoteDto`, `BatchSyncResponseDto` (statusCode 200/207, resumen, detalle por ítem). |
| `ms-incidencias/src/sincronizacion/sincronizacion.service.ts` | Servicio `SincronizacionService`: procesa cada acción de forma aislada (ordenado por `timestamp_local`, try/catch por ítem, transacción por escritura), verifica permiso granular por tipo antes de ejecutar, devuelve reporte detallado. |
| `ms-incidencias/src/sincronizacion/sincronizacion.controller.ts` | Controlador `SincronizacionController`: ruta `POST /sincronizacion/lote`, protegido con `JwtAuthGuard` (APP_GUARD global), decoradores `@nestjs/swagger` para OpenAPI. |
| `ms-incidencias/src/sincronizacion/sincronizacion.module.ts` | Módulo `SincronizacionModule`: importa `PrismaModule` e `IncidenciasModule`, declara controlador y servicio. |


### Archivos modificados

| Archivo | Cambio |
|---|---|
| `ms-incidencias/src/app.module.ts` | Importa y registra `SincronizacionModule` en los imports del `AppModule`. |
| `api gateway/index.js` | Registra proxy `fastify.register(proxy, { prefix: '/api/v1/sincronizacion', ... })` hacia `ms-incidencias:3002`. |
| `openapi.yaml` | Versión 1.3.0 → 1.4.0; sección de cambios v1.4.0; nuevo path `POST /sincronizacion/lote` con esquemas `BatchSyncRequest`, `SyncAction`, `ItemResultado`, `ResumenLote`, `BatchSyncResponse`. |
| `ms-incidencias/package.json` | Agregada dependencia `@nestjs/swagger@^12.0.0` (necesaria para decoradores Swagger en los DTOs y controlador). |
| `ms-incidencias/pnpm-lock.yaml` | Actualizado por `pnpm add @nestjs/swagger`. |

### Dependencias previas verificadas (TAL-137, TAL-97)

- **Contrato OpenAPI (TAL-137):** `openapi.yaml` v1.4.0 operativo con paths `/incidencias`, `/ordenes-trabajo`, `/estados-incidencia`, `/tipos-evidencia` y ahora `/sincronizacion/lote`.
- **DTOs base de incidencias:** `CrearIncidenciaDto`, `CrearEvidenciaDto`, `ActualizarEstadoDto` existentes con `class-validator`.
- **Esquema Prisma ms-incidencias:** `Incidencias`, `Evidencia`, `OrdenTrabajo`, `HistorialEstados`, `EstadoIncidencia`, `TipoEvidencia` operativos.
- **Guards JWT + RBAC (TAL-97):** `JwtAuthGuard` (global APP_GUARD), `PermissionsGuard` granular, `RequirePermissions`, `JwtUser.permissions` via JWT. Catálogo de permisos en `ms-auth/prisma/seed.cjs` (`incidencias:crear`, `evidencias:subir`, `incidencias:resolver`, etc.).


## 2. Decisiones de Arquitectura (Justificación)

### 2.1 Procesamiento con fallo parcial aislado (Partial Success / HTTP 207) frente a transacción monolítica

**Decisión:** Se implementó procesamiento aislado por ítem con `try/catch` dentro de un bucle secuencial, respondiendo **HTTP 207 (Multi-Status)** cuando existe al menos una acción con error, y **HTTP 200** cuando todas son exitosas. Cada acción válida se persiste inmediatamente (transacción por escritura individual) y **no se revierte** ante el fallo de otra acción.

**¿Por qué no `prisma.$transaction([...])` monolítico?**

Una transacción monolítica de Prisma (`$transaction([promesas])`) hace rollback de **todo** el lote si cualquier operación falla. En un escenario Offline-First esto es perjudicial:

| Escenario | Transacción monolítica | Procesamiento aislado (implementado) |
|---|---|---|
| Usuario envía 10 acciones offline, 1 falla por permiso | Las 9 válidas se revierten; el cliente debe reenviar las 10 | Las 9 válidas se persisten; el cliente solo reintenta la fallida |
| Usuario envía 50 acciones, 1 tiene datos inválidos | Pierde todas las 50 | Solo se descarta la inválida; las 49 se confirman |
| Conexión intermitente a DB en mitad del lote | Rollback completo | Las acciones ya aplicadas permanecen; el resto se reporta como error |

**Impacto en la experiencia de usuario (Offline-First):**

- **Menor consumo de batería y datos:** El cliente envía un lote en lugar de N peticiones HTTP individuales. Cada petición individual implica handshake TLS, cabeceras, y radio móvil encendido más tiempo.
- **Reintentos selectivos:** El reporte por ítem (`detalle[]`) permite al cliente móvil saber exactamente qué acciones fallaron y por qué, reenviando únicamente esas en el próximo ciclo de sincronización.
- **Persistencia progresiva:** Las acciones válidas se aplican inmediatamente, no se quedan "atrapadas" esperando a que todo el lote sea perfecto.

### 2.2 Límite máximo de 50 operaciones por lote (`@ArrayMaxSize(50)`)

**Justificación:**

1. **Protección contra abusos y DoS:** Un lote ilimitado podría saturar la CPU y la conexión a DB del microservicio. 50 es un techo razonable que equilibra utilidad y estabilidad.
2. **Consumo de batería y datos móviles:** Lotes muy grandes aumentan el tamaño del payload JSON y el tiempo de procesamiento, manteniendo la radio móvil encendida por más tiempo. 50 acciones caben cómodamente en un solo paquete TCP típico.
3. **Tiempo de respuesta predecible:** El cliente móvil obtiene una respuesta en un tiempo acotado, evitando timeouts de conexión en redes móviles inestables.
4. **Memoria del servidor:** Procesar 50 acciones de forma secuencial con transacciones individuales consume memoria constante y predecible.

### 2.3 Ordenamiento por `timestamp_local` frente a peticiones individuales en paralelo

**Decisión:** Las acciones se ordenan por `timestamp_local` (tiempo en que el cliente las generó offline) antes de procesarlas.

**¿Por qué respetar `timestamp_local`?**

- **Consistencia causal:** Si un usuario creó una incidencia y luego le subió una evidencia, la evidencia debe procesarse después de la creación. Procesar en paralelo podría causar errores de "incidencia no encontrada" si la evidencia se procesa antes de que exista la incidencia.
- **Reproducibilidad:** El orden determinista permite al cliente predecir el estado del servidor tras la sincronización.
- **Depuración:** Los logs del servidor muestran las acciones en el orden cronológico en que el usuario las generó.

**¿Por qué no peticiones individuales en paralelo desde el cliente móvil?**

| Enfoque | Peticiones individuales en paralelo | Lote único de 50 (implementado) |
|---|---|---|
| Consumo de batería | Alto (N handshakes TLS, radio móvil encendida N veces) | Bajo (1 handshake, 1 ciclo de radio) |
| Consumo de datos | Alto (N × cabeceras HTTP) | Bajo (1 conjunto de cabeceras) |
| Conexiones concurrentes | N conexiones al servidor | 1 conexión |
| Manejo de errores | El cliente debe rastrear N respuestas individuales | 1 respuesta con reporte consolidado por ítem |
| Complejidad del cliente | Alta (cola de reintentos por acción) | Media (1 reintento del lote o reintento de fallidos) |


## 3. Seguridad

- **JWT:** Validado por el `APP_GUARD` global (`JwtAuthGuard`). Toda petición sin token o con token inválido/expirado devuelve 401 antes de llegar al controlador.
- **RBAC granular por acción:** El permiso requerido varía según el `tipo` de cada acción dentro del lote. El mapeo está en `sincronizacion.types.ts`:
  - `crear_incidencia` → `incidencias:crear`
  - `subir_evidencia` → `evidencias:subir`
  - `actualizar_estado` → `incidencias:resolver`
- Los permisos viajan firmados en el JWT (`JwtUser.permissions`), por lo que la verificación se hace en memoria por acción sin consultar `ms-auth` en cada ítem del lote.
- Si un usuario no tiene el permiso para un tipo de acción, esa acción específica se reporta como `ERROR` con motivo, y las demás acciones del lote continúan normalmente.

## 4. Guía de Pruebas

### Prerrequisitos

1. Levantar infraestructura: `docker-compose up -d incidencias_db rabbitmq` (puerto 5434 y 5672).
2. Compilar y levantar `ms-incidencias`:
   ```bash
   cd ms-incidencias
   pnpm run build
   node dist/main
   ```
3. El API Gateway debe estar levantado en el puerto 3000 (proxy hacia `:3002`).

### Ejemplo de prueba con `curl`

El siguiente `curl` envía un lote de 3 acciones mixtas usando un token de rol `REPORTANTE` (tiene `incidencias:crear` y `evidencias:subir`, pero **NO** `incidencias:resolver`):

```bash
curl -X POST http://localhost:3002/api/v1/sincronizacion/lote \
  -H "Authorization: Bearer <TOKEN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "acciones": [
      {
        "id_accion_local": "acc-local-001",
        "tipo": "crear_incidencia",
        "payload": {
          "id_activo": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
          "titulo": "Falla de energía en planta norte",
          "descripcion": "No hay suministro eléctrico desde las 08:00",
          "prioridad": "alta"
        },
        "timestamp_local": "2026-11-20T08:00:00.000Z"
      },
      {
        "id_accion_local": "acc-local-002",
        "tipo": "crear_incidencia",
        "payload": {
          "id_activo": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
        },
        "timestamp_local": "2026-11-20T08:01:00.000Z"
      },
      {
        "id_accion_local": "acc-local-003",
        "tipo": "actualizar_estado",
        "payload": {
          "id_incidencia": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
          "id_estado": 2
        },
        "timestamp_local": "2026-11-20T08:02:00.000Z"
      }
    ]
  }'
```

### Respuesta esperada (HTTP 207)

```json
{
  "statusCode": 207,
  "message": "Lote procesado con errores parciales: 1 exitosas, 2 fallidas.",
  "resumen": {
    "total": 3,
    "exitosos": 1,
    "errores": 2
  },
  "detalle": [
    {
      "id_accion_local": "acc-local-001",
      "estado": "OK",
      "recurso_id": "f7a2b3c4-d5e6-4a7b-8c9d-0123456789ab",
      "motivo": null
    },
    {
      "id_accion_local": "acc-local-002",
      "estado": "ERROR",
      "recurso_id": null,
      "motivo": "titulo es obligatorio en el payload"
    },
    {
      "id_accion_local": "acc-local-003",
      "estado": "ERROR",
      "recurso_id": null,
      "motivo": "Permiso insuficiente para ejecutar 'actualizar_estado': se requiere 'incidencias:resolver'"
    }
  ]
}
```

**Interpretación:**

- `acc-local-001` → **OK**: Se creó la incidencia y se persiste en BD (`recurso_id` = UUID de la incidencia).
- `acc-local-002` → **ERROR**: Faltó `titulo` en el payload (validación de datos). No se persistió nada.
- `acc-local-003` → **ERROR**: El rol `REPORTANTE` no tiene el permiso `incidencias:resolver` (RBAC). No se modificó el estado de la incidencia.

El cliente móvil debe reintentar únicamente `acc-local-002` (con datos corregidos) y `acc-local-003` (con un usuario que tenga el permiso correspondiente), ya que `acc-local-001` ya se aplicó correctamente.

### Validación del límite de 50

Enviar 51 acciones devuelve HTTP 400 (rechazado por `@ArrayMaxSize(50)` en el `ValidationPipe` global antes de llegar al controlador).

### Contrato OpenAPI

El endpoint está documentado en `openapi.yaml` (v1.4.0) bajo el path `POST /sincronizacion/lote` y accesible vía API Gateway en `http://localhost:3000/api/openapi.yaml`.

## 5. Consideraciones Operativas

- **Esquema de base de datos:** La acción `crear_incidencia` requiere que la tabla `INCIDENCIAS` tenga la columna `prioridad` y que exista el estado inicial `'Reportada'` en `ESTADOS_INCIDENCIA`. Estas dependen de las migraciones TAL-40 y el seed de Prisma.
- **Notificaciones:** `crear_incidencia` llama a `notificarIncidencia()` (try/catch, no bloquea si `ms-notificaciones` no responde).
- **WebSockets/RabbitMQ:** Las incidencias críticas (prioridad `alta`) emiten eventos vía RabbitMQ y WebSocket si los servicios están disponibles (no bloquean la respuesta del lote).
- **Kill Switch:** El `KillSwitchGuard` (APP_GUARD global) bloquea operaciones mutantes (incluido este POST) si el kill switch está activo, devolviendo 503.
