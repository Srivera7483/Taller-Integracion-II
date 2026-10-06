# TAL-60: Compatibilidad con el contrato OpenAPI — sección Incidencias

## 1. Diagnóstico previo

- El contrato OpenAPI (versión 1.0.0) cubría únicamente las secciones Auth y Activos.
- La sección de Incidencias estaba implementada en `ms-incidencias` pero no documentada en el contrato.
- El filtro global de excepciones `OpenApiExceptionFilter` devolvía campos extra (`statusCode`, `timestamp`, `path`, `message`) que no forman parte del esquema `Error` acordado en el contrato.
- El contrato define el esquema `Error` como `{ mensaje: string }` únicamente.

Diagnóstico: dos brechas identificadas — filtro de errores no cumple el esquema `Error` del contrato, y las rutas de incidencias no estaban registradas en el YAML.

## 2. Resumen técnico

- `ms-incidencias/src/common/filters/openapi-exception.filter.ts`: corrige el cuerpo de la respuesta de error para devolver solo `{ mensaje }`.
- `docs/openapi.yaml`: versión 1.1.0 del contrato. Agrega tag `Incidencias`, tag `Catalogos`, 9 rutas y 8 esquemas nuevos.

## 3. Cambio 1 — Filtro de excepciones

### Problema

El filtro devolvía:

```json
{
  "statusCode": 400,
  "mensaje": "...",
  "message": "...",
  "timestamp": "2026-09-27T00:00:00.000Z",
  "path": "/api/v1/incidencias"
}
```

El cliente móvil (TI4) espera exactamente `{ "mensaje": "..." }` según el esquema `Error` del contrato.

### Solución

```typescript
// ANTES
httpAdapter.reply(context.getResponse(), {
  statusCode,
  mensaje: message,
  message,
  timestamp: new Date().toISOString(),
  path: httpAdapter.getRequestUrl(context.getRequest()),
}, statusCode);

// DESPUÉS
httpAdapter.reply(context.getResponse(), { mensaje: message }, statusCode);
```

**Archivo modificado:** `ms-incidencias/src/common/filters/openapi-exception.filter.ts`

### Impacto

- Todos los errores HTTP (400, 401, 403, 404, 500) del microservicio ahora responden con `{ "mensaje": "..." }`.
- La información de depuración (`statusCode`, `timestamp`, `path`) ya no se expone al cliente. El logger interno conserva el stack trace para errores 5xx.

## 4. Cambio 2 — Contrato OpenAPI v1.1.0

### Archivo generado

`docs/openapi.yaml` (versión 1.1.0)

### Rutas agregadas

| Método | Ruta | operationId | Roles |
|---|---|---|---|
| `GET` | `/incidencias` | `listarIncidencias` | Todos |
| `POST` | `/incidencias` | `crearIncidencia` | Todos |
| `GET` | `/incidencias/{id_incidencia}` | `obtenerIncidencia` | Todos |
| `PATCH` | `/incidencias/{id_incidencia}/estado` | `actualizarEstadoIncidencia` | SUPERVISOR, TECNICO |
| `GET` | `/incidencias/{id_incidencia}/historial` | `listarHistorialIncidencia` | Todos |
| `GET` | `/incidencias/{id_incidencia}/evidencias` | `listarEvidencias` | Todos |
| `POST` | `/incidencias/{id_incidencia}/evidencias` | `crearEvidencia` | Todos |
| `GET` | `/estados-incidencia` | `listarEstadosIncidencia` | Todos |
| `GET` | `/tipos-evidencia` | `listarTiposEvidencia` | Todos |

### Esquemas agregados

| Schema | Descripción |
|---|---|
| `EstadoIncidencia` | `{ id_estado: integer, nombre_estado: string }` |
| `TipoEvidencia` | `{ id_tipo_evidencia: integer, nombre_tipo: string }` |
| `Incidencia` | Entidad principal. Incluye `estado` (estado actual, no array). |
| `HistorialIncidencia` | Un evento de cambio de estado con `id_usuario_cambio`. |
| `Evidencia` | Evidencia adjunta con `tipo` (objeto) y `url_evidencia`. |
| `CrearIncidenciaRequest` | Body para `POST /incidencias`. |
| `ActualizarEstadoRequest` | Body para `PATCH /incidencias/{id}/estado`. |
| `CrearEvidenciaRequest` | Body para `POST /incidencias/{id}/evidencias`. |

### Respuesta global agregada

| Clave | HTTP | Descripción |
|---|---|---|
| `Prohibido` | 403 | El rol del usuario no puede realizar la operación. |

### Decisiones de diseño

- **`estado` en `Incidencia` es un objeto, no un array:** el servicio calcula el estado actual (último del historial) y lo mapea a un objeto `EstadoIncidencia`. El historial completo se obtiene por separado con `GET /historial`.
- **`fecha_creacion` en incidencias:** mantiene el nombre que usa `toApiIncidencia()`. El patrón `created_at` se usa en los esquemas de Activos y Usuarios (ms-activos y ms-auth), pero la implementación de incidencias ya usa `fecha_creacion` en todas sus respuestas.
- **`id_reportante` e `id_usuario_cambio` son UUIDs:** referencias a `USUARIOS.id_usuario`, pero el microservicio de incidencias no hace join con la tabla de usuarios (arquitectura de microservicios). El cliente puede enriquecer con `GET /auth/me` o datos en caché.

## 5. Verificación

Validar compilación y pruebas:

```powershell
cd ms-incidencias
yarn run build
npm.cmd test -- --runInBand
```

Verificar que cualquier ruta de incidencias devuelva solo `{ "mensaje": "..." }` en error:

```powershell
# Ejemplo: UUID inválido → 400 con { "mensaje": "..." }
curl -s -H "Authorization: Bearer <token>" http://localhost:3002/api/v1/incidencias/no-es-uuid
```

## 6. Resultado

- Filtro de errores: corregido. Responde solo `{ "mensaje": "..." }`.
- Contrato OpenAPI: actualizado a v1.1.0 con sección Incidencias completa.
- Rutas documentadas: 9 rutas nuevas.
- Esquemas documentados: 8 esquemas nuevos + 1 respuesta global nueva (Prohibido).
- Sin cambios en la lógica de negocio ni en la base de datos.
