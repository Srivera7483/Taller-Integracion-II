# TAL-164 - Registros de auditoría

## Resumen técnico

Se implementó el endpoint protegido:

```text
GET /api/v1/auth/audit/logs?page=1&limit=20
```

### Archivos principales

- `ms-auth/prisma/schema.prisma`: modelo `AuditLog` y evento `AuditEvent`.
- `ms-auth/prisma/migrations/20261101190600_add_audit_logs/migration.sql`: estructura PostgreSQL.
- `ms-auth/src/auth/audit.service.ts`: persistencia y paginación.
- `ms-auth/src/auth/dto/audit-pagination.dto.ts`: validación de `page` y `limit`.
- `ms-auth/src/auth/auth.controller.ts`: endpoint administrativo y recepción interna de bloqueos.
- `ms-auth/src/auth/auth.service.ts`: registro de inicio de sesión exitoso y fallido.
- `api gateway/index.js`: envío del evento `RATE_LIMIT_BLOCKED` al autenticador.

## Decisiones arquitectónicas

Los registros se almacenan en PostgreSQL dentro de `ms-auth`. A diferencia de analizar archivos de servidor, una tabla relacional permite paginar, consultar, auditar y correlacionar eventos mediante índices y estructura tipada. La auditoría permanece disponible aunque cambien los archivos o reinicie el proceso.

Se utiliza paginación offset-based (`skip/take`) para este panel administrativo. Es simple, permite calcular el total y navegar directamente a páginas específicas. El costo crece cuando `page` es muy grande; por ello se limita `limit` a 100. Para exportaciones masivas o secuencias infinitas se podría migrar posteriormente a cursor-based sin alterar el contrato público actual.

El método cuenta con `JwtAuthGuard` y `RolesGuard`. El JWT se valida primero y adjunta el rol a la solicitud. Después `RolesGuard` compara el rol `ADMINISTRADOR` con el contenido del token y rechaza el acceso antes de llamar a `AuditService`, devolviendo `403`. Una solicitud sin JWT es rechazada por `JwtAuthGuard` con `401`.

El endpoint interno que recibe bloqueos del gateway exige `x-audit-secret`. El secreto debe configurarse con `AUDIT_INTERNAL_SECRET` en ambos servicios en producción.

## Pruebas

Inicie los servicios, realice las credenciales de prueba y consulte el endpoint mediante el gateway.

### Administrador: HTTP 200

```bash
ADMIN_TOKEN="$(
  curl -s -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@empresa.com","password":"password123"}' |
  node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).token"
)"

curl -i "http://localhost:3000/api/v1/auth/audit/logs?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Técnico: HTTP 403

```bash
TECH_TOKEN="$(
  curl -s -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"tecnico@empresa.com","password":"password123"}' |
  node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).token"
)"

curl -i "http://localhost:3000/api/v1/auth/audit/logs?page=1&limit=20" \
  -H "Authorization: Bearer $TECH_TOKEN"
```

### Sin token: HTTP 401

```bash
curl -i "http://localhost:3000/api/v1/auth/audit/logs?page=1&limit=20"
```
