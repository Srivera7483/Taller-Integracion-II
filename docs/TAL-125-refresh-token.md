# TAL-125: Refresh Token para sesiones

## Resumen técnico

`ms-auth` emite access tokens JWT con una vigencia de 15 minutos y refresh tokens
con una vigencia de 7 días. El login conserva el campo `token` para mantener
compatibilidad con clientes actuales, pero entrega el refresh token únicamente
en una cookie `HttpOnly`. `POST /auth/refresh` valida la firma, expiración y
propósito del token, consulta al usuario en Prisma y devuelve un access token
nuevo si la cuenta sigue activa (no tiene `fechaEliminacion`).

| Archivo | Cambio |
| --- | --- |
| `ms-auth/src/auth/auth.module.ts` | TTL de access token configurado en 15 minutos. |
| `ms-auth/src/auth/auth.service.ts` | Emisión de refresh JWT por 7 días y validación/consulta de usuario al renovar. |
| `ms-auth/src/auth/auth.controller.ts` | Cookie HttpOnly al iniciar sesión y nuevo endpoint `POST /auth/refresh`. |
| `ms-auth/src/auth/jwt-auth.guard.ts` | Rechazo explícito de refresh tokens en rutas protegidas con access token. |
| `ms-auth/src/auth/auth.types.ts` | Claim `tokenUse` para distinguir el propósito del JWT. |
| `frontend-web/src/services/api.js` | Envío de cookies y renovación/reintento único al recibir 401 en una ruta protegida. |
| `ms-auth/src/auth/*.spec.ts` | Pruebas unitarias de login, renovación, errores y guard. |
| `ms-auth/.env.example` | Variable `JWT_REFRESH_SECRET` documentada. |

## Decisiones de arquitectura

### Access corto y refresh largo

Un access token de 24 horas amplía el tiempo durante el que un token robado
puede usarse sin volver a autenticarse. Con un access token de 15 minutos, la
ventana de exposición de ese token es menor y los clientes pueden renovarlo sin
interrumpir la sesión.

La renovación comprueba el estado actual del usuario en la base de datos. Por
eso, una cuenta eliminada deja de poder obtener access tokens nuevos incluso
si su refresh JWT aún no expiró. El diseño actual no mantiene sesiones ni una
lista de refresh tokens revocados: un refresh token robado o una sesión
individual no se puede revocar de inmediato mientras el usuario siga activo;
su vigencia máxima es de 7 días. Para revocación inmediata por sesión se
necesitaría persistir sesiones/versiones de token y revocarlas al cerrar sesión
o detectar un compromiso.

Los refresh tokens tienen el claim `tokenUse: "refresh"` y el guard de las
rutas protegidas rechaza ese propósito. Se recomienda configurar
`JWT_REFRESH_SECRET` con un secreto aleatorio diferente de `JWT_SECRET`; el
fallback al secreto de acceso solo existe para desarrollo/compatibilidad y no
se permite en `NODE_ENV=production`.

### Transporte del refresh token: cookie HttpOnly

El refresh token se envía como cookie `HttpOnly; SameSite=Strict`, limitada a
`/api/v1/auth`, con duración de siete días. En producción se agrega `Secure`,
por lo que el tráfico debe usar HTTPS. La API no incluye el refresh token en
el JSON del login. El access token sigue en el JSON y el campo `token` se
conserva por compatibilidad.

- **XSS:** JavaScript del cliente no puede leer la cookie `HttpOnly`, a
  diferencia de un refresh token en el body que luego se guarde en
  `localStorage` o `sessionStorage`. Una vulnerabilidad XSS aún podría ejecutar
  acciones autenticadas desde el navegador, por lo que `HttpOnly` no sustituye
  defensas XSS.
- **CSRF:** el navegador envía cookies automáticamente, así que existe un
  riesgo CSRF mayor que con un token puesto explícitamente en un body/header
  por JavaScript. `SameSite=Strict`, el método POST y el alcance de ruta reducen
  ese riesgo. Si el despliegue requiere cookies cross-site, deberá usar
  `SameSite=None; Secure` y agregar protección CSRF (token anti-CSRF y
  validación de `Origin`) antes de habilitarlo.
- **Body JSON:** evita el envío automático de credenciales y reduce el riesgo
  CSRF, pero expone el refresh token a JavaScript y a XSS. No se eligió porque
  el refresh token tiene más duración y el cliente web no necesita leerlo.

El cliente web configura el envío de cookies, intenta renovar una sola vez
ante un `401` de una ruta protegida y reintenta esa solicitud con el nuevo
access token. Si la renovación falla, elimina el access token local y propaga
el error original.

## Guía de pruebas

Las rutas públicas pasan por el gateway (`http://localhost:3000/api/v1/auth`).
Para probar el microservicio directamente se puede usar
`http://localhost:3001/auth`.

### 1. Login y refresh exitoso (HTTP 200)

El login guarda el refresh token en la cookie y devuelve el access token.
`curl` conserva la cookie en `cookies.txt`:

```bash
curl -i -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"pass123"}' \
  http://localhost:3000/api/v1/auth/login

curl -i -b cookies.txt \
  -X POST http://localhost:3000/api/v1/auth/refresh
```

La renovación válida responde `200 OK` con:

```json
{"accessToken":"<nuevo-access-token>"}
```

### 2. Token manipulado (HTTP 401)

Una cookie con JWT alterado debe rechazarse:

```bash
curl -i \
  -X POST \
  -H "Cookie: refresh_token=eyJhbGciOiJIUzI1NiJ9.manipulado.firma-invalida" \
  http://localhost:3000/api/v1/auth/refresh
```

La respuesta esperada es `401 Unauthorized`. Un token firmado válido pero
expirado, de propósito distinto o asociado a un usuario eliminado también se
rechaza con HTTP 401.

### Pruebas HTTP automatizadas

El flujo HTTP de login y refresh se prueba sin PostgreSQL real, sustituyendo
solo el repositorio de usuarios:

```powershell
cd ms-auth
pnpm.cmd exec vitest run --config vitest.config.e2e.ts src/auth/auth.refresh.e2e-spec.ts
```

Las pruebas comprueban cookie y campos de respuesta del login, claims y TTL
reales de ambos JWT, refresh exitoso, token manipulado, token expirado y
usuario eliminado.

## Estado de verificación de entorno

Docker y PostgreSQL están disponibles, y `prisma migrate status` confirma que
las cinco migraciones están aplicadas. `ms-auth` inició correctamente y
respondió en HTTP. Con un usuario de prueba existente se verificaron login
`200`, `GET /auth/me` `200`, refresh `200` y token manipulado `401`; los TTL
observados fueron 900 segundos para access y 604800 para refresh.

La suite unitaria completa pasa (29 casos), al igual que la suite e2e completa
(8 casos). La prueba Prisma heredada se actualizó para usar el modelo actual y
limpiar el usuario/rol de prueba al finalizar.
