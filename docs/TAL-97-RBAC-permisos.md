# TAL-97: RBAC granular por permisos

## Resumen tecnico

Se alinea el acceso con las tablas `PERMISOS` y `ROLES_PERMISOS` del MER.

### Archivos principales modificados

- `ms-auth/prisma/schema.prisma`: nombre de permiso unico en el modelo `Permiso`.
- `ms-auth/prisma/seed.cjs`: catalogo de permisos y relaciones por rol.
- `ms-auth/package.json`: comando `db:seed`.
- `ms-auth/src/auth/user.repository.ts`: carga los permisos asociados al rol.
- `ms-auth/src/auth/auth.service.ts`: incluye permisos en login, refresh y perfil.
- `ms-auth/src/auth/jwt-auth.guard.ts`: inyecta permisos del JWT en `request.user`.
- `ms-auth/src/auth/permissions.decorator.ts`: declara permisos requeridos.
- `ms-auth/src/auth/permissions.guard.ts`: aplica `AND` sobre permisos requeridos.
- `ms-auth/src/auth/auth.controller.ts`: protege gestion de usuarios con permisos.
- `frontend-web/src/services/authService.js`: almacena y expone permisos.
- `frontend-web/src/components/ProtectedRoute.jsx`: permite proteccion por rol y permiso.
- `frontend-web/src/App.jsx`: asigna permisos a rutas sensibles.
- `frontend-web/src/components/Toast.jsx`: corrige el bloque JSX que bloqueaba la compilacion.

## Catalogo desplegado

- `incidencias:crear`
- `incidencias:ver`
- `incidencias:resolver`
- `incidencias:clasificar_prioridad`
- `evidencias:subir`
- `ordenes:asignar`
- `ordenes:diagnosticar`
- `activos:gestionar`
- `mantenimientos:crear`
- `estadisticas:ver`
- `usuarios:gestionar`

El seed crea 11 permisos y 28 relaciones sobre los roles `REPORTANTE`, `TECNICO`, `SUPERVISOR` y `ADMINISTRADOR`.

## Decisiones de arquitectura

El token continuo incluyendo el rol preserva compatibilidad, mientras el arreglo `permissions` permite decisiones granulares independientes de las etiquetas de rol. Esto desacopla controladores y vistas de una enumeracion fija de roles y permite que varios roles compartan acciones.

Incluir permisos en el JWT evita una consulta PostgreSQL por solicitud en API Gateway y Guards, reduciendo latencia y dependencia de la base de datos en el camino caliente. La contraparte es la eventual consistencia temporal: cambios de permisos no revocados requieren renovar el acceso mediante refresh o una expiracion corta. La estrategia recomendada es mantener tokens cortos, validar autorizacion sensible en el microservicio y propagar la revocacion mediante refresh.

## Ejecucion y verificacion

```powershell
Set-Location ms-auth
npx prisma generate
npm run db:seed
npm run build
npm run test:e2e
```

```sql
SELECT count(*) FROM "PERMISOS";
SELECT count(*) FROM "ROLES_PERMISOS";
```

## Pruebas con curl

Ejecute desde la maquina host:

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"pass123"}'
```

Guarde el token recibido y decodifique su payload:

```bash
node -e "const jwt=process.argv[1].split('.')[1].replace(/-/g,'+').replace(/_/g,'/'); console.log(JSON.parse(Buffer.from(jwt,'base64')))" "$TOKEN"
```

Prueba de ruta protegida sin permiso:

```bash
curl -i http://localhost:8080/api/v1/auth/usuarios \
  -H "Authorization: Bearer $TOKEN_REPORTANTE"
```

Para validar `403 Forbidden`, el token debe pertenecer a un rol sin `usuarios:gestionar`.

Renovacion:

```bash
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Cookie: refresh_token=$REFRESH_TOKEN"
```

La respuesta de refresh contiene `accessToken` y `permissions`.
