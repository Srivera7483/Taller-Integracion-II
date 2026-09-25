# TAL-53: Endpoint para registro de metadatos de evidencia

## Diagnostico previo

- PostgreSQL de `ms-incidencias` responde en `localhost:5434`.
- `prisma validate` fue exitoso y no existen migraciones pendientes.
- La compilacion y las pruebas previas del microservicio fueron exitosas.
- TAL-52 esta implementada: `Evidencia` tiene FK hacia `Incidencias`.

## Resumen tecnico

- `ms-incidencias/src/incidencias/dto/crear-evidencia.dto.ts`: valida `incidencia_id`, `descripcion` y `fecha` opcional con `class-validator`.
- `ms-incidencias/src/auth/jwt-auth.guard.ts`: verifica el Bearer JWT usando la misma clave y claims que `ms-auth`.
- `ms-incidencias/src/auth/reportante.guard.ts`: limita la operación al rol exacto `Reportante`.
- `ms-incidencias/src/auth/auth.module.ts`: registra `JwtService` y los guards mediante inyección de dependencias.
- `ms-incidencias/src/incidencias/incidencias.controller.ts`: expone `POST /incidencias/evidencias`.
- `ms-incidencias/src/incidencias/incidencias.service.ts`: consulta primero la incidencia y luego inserta la metadata.
- `ms-incidencias/src/main.ts`: aplica validación global estricta del body.
- `ms-incidencias/src/incidencias/evidencia.service.spec.ts`: cubre creación y rechazo por incidencia inexistente.

La carga binaria a S3 queda fuera de esta tarea. La fila solo persiste `incidencia_id`, `descripcion` y `fecha`; `id_evidencia` lo genera Prisma.

## Flujo y respuestas

1. `JwtAuthGuard` valida el token y extrae `userId` y `role`.
2. `ReportanteGuard` exige `role === "Reportante"`.
3. `ValidationPipe` rechaza campos desconocidos o datos con formato inválido.
4. `IncidenciasService` consulta `Incidencias` por `incidencia_id`.
5. Si existe, Prisma crea la fila en `Evidencia` y Nest responde `201 Created`.
6. Si no existe, responde `404 Not Found` y no ejecuta el `INSERT`.

## Decisión arquitectónica: consulta previa

La consulta previa entrega un error de dominio explícito (`404 Incidencia no encontrada`) antes de intentar escribir. También permite ampliar posteriormente reglas de negocio, como validar que el reportante tenga acceso a esa incidencia, sin depender de interpretar errores internos del ORM.

Intentar directamente el `INSERT` y capturar `P2003` reduce una operación en el camino exitoso y deja que la base de datos sea la última garantía de integridad. Sin embargo, acopla el controlador a códigos de error de Prisma/PostgreSQL, mezcla una violación de integridad con un caso esperado de negocio y hace menos claro el contrato HTTP.

En rendimiento, la inserción directa gana una consulta en el caso exitoso. La diferencia es pequeña frente al coste de la petición y la FK sigue siendo necesaria como protección contra carreras y escrituras fuera de la API. Para este endpoint se prioriza la experiencia de desarrollo, la respuesta `404` estable y la extensibilidad; la restricción de base permanece como segunda línea de integridad.

## Inyección de dependencias

Nest inyecta `PrismaService` en `IncidenciasService`, `JwtService` en `JwtAuthGuard` y registra ambos guards en `AuthModule`. `AuthModule` es global para que el controlador pueda usar `@UseGuards(JwtAuthGuard, ReportanteGuard)` sin crear instancias manuales ni duplicar la configuración de `JWT_SECRET`.

## Guía de validación

Definir la misma clave usada por `ms-auth` y colocar un JWT cuyo claim `role` sea `Reportante`.

### Éxito: 201

```powershell
curl.exe -X POST http://localhost:3002/incidencias/evidencias `
  -H "Authorization: Bearer TOKEN_REPORTANTE" `
  -H "Content-Type: application/json" `
  -d '{"incidencia_id":"11111111-1111-1111-1111-111111111111","descripcion":"Fotografía del daño","fecha":"2026-09-24T20:00:00.000Z"}'
```

### Incidencia inexistente: 404

Usar un UUID válido pero ausente en `Incidencias`. El servicio responde `404` y no inserta evidencia.

### Rol incorrecto: 403

Usar un JWT válido cuyo claim sea, por ejemplo, `role: "Tecnico"`. El guard responde `403 Forbidden`. Sin token o con token inválido, responde `401 Unauthorized`.

## Validación ejecutada

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5434/incidencias_db?schema=public"
npx.cmd prisma validate
npx.cmd prisma migrate deploy
npm.cmd run build
npm.cmd test -- --runInBand
```