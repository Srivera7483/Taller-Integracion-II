# TAL-29 - Middleware de validacion de claims JWT

## 1. Identificacion de la tarea

- **ID:** TAL-29
- **Nombre:** Middleware de validacion de claims JWT
- **Objetivo:** Crear el interceptor que extraiga el token de las cabeceras HTTP y valide su vigencia y firma.

## Como hacerlo funcionar

Con MS Auth ejecutandose en `http://localhost:3001`, obtener un token mediante `POST /auth/login` usando credenciales de un usuario existente. Guardarlo solo en la sesion local y probar la ruta protegida:

```powershell
$token = "<accessToken-obtenido-localmente>"
curl.exe -i http://localhost:3001/auth/me -H "Authorization: Bearer $token"
```

Un token valido debe producir `200 OK` con `userId` y `role`. Para comprobar el rechazo de autenticacion, ejecutar la misma ruta sin la cabecera o con un token invalido; la respuesta esperada es `401 Unauthorized`.

## 2. Criterios de aceptacion y verificacion

### Criterio 1

**Requisito:** Si una peticion a una ruta protegida no tiene token o este es invalido o expirado, el servidor retorna estrictamente `401 Unauthorized`.

**Estado:**

- **Cumplido**

**Evidencia:**

- `ms-auth/src/auth/jwt-auth.guard.ts`, extraccion de `Authorization: Bearer` y llamada a `JwtService.verify`.
- `ms-auth/src/auth/auth.controller.ts`, `@UseGuards(JwtAuthGuard)` en `GET /auth/me`.
- `ms-auth/test/app.e2e-spec.ts`, pruebas HTTP para ausencia, token invalido y token expirado.
- Resultado ejecutado: las tres solicitudes respondieron `401`.

**Descripcion:**

El guard lanza `UnauthorizedException` cuando falta el token, falla la firma o falla la vigencia. La prueba e2e verifico los tres casos mediante solicitudes HTTP a `GET /auth/me`.

### Criterio 2

**Requisito:** Si el token es valido, el middleware inyecta los datos decodificados, como `user.id` y `user.role`, en el objeto `Request` para que los controladores puedan usarlos.

**Estado:**

- **Cumplido**

**Evidencia:**

- `ms-auth/src/auth/jwt-auth.guard.ts`, asignacion de `request.user`.
- `ms-auth/src/auth/auth.types.ts`, tipo `JwtUser` con `userId` y `role`.
- `ms-auth/src/auth/auth.controller.ts`, lectura de `request.user` en `GET /auth/me`.
- `ms-auth/test/app.e2e-spec.ts`, prueba HTTP con token valido.
- Resultado ejecutado: `GET /auth/me` respondio `200` con `userId` y `role`.

**Descripcion:**

El guard verifica los claims, asigna `{ userId, role }` a `request.user` y el controlador devuelve esos datos. La prueba e2e confirmo la disponibilidad de ambos valores.

## 3. Archivos relacionados

- **Ruta:** `ms-auth/src/auth/jwt-auth.guard.ts`  
  **Relacion con el criterio:** Extrae, verifica y valida el token JWT y asigna los claims a la peticion.

- **Ruta:** `ms-auth/src/auth/auth.types.ts`  
  **Relacion con el criterio:** Define `userId` y `role` como datos del usuario autenticado.

- **Ruta:** `ms-auth/src/auth/auth.controller.ts`  
  **Relacion con el criterio:** Protege `GET /auth/me` y utiliza `request.user`.

- **Ruta:** `ms-auth/test/app.e2e-spec.ts`  
  **Relacion con el criterio:** Verifica respuestas `401`, respuesta `200` e inyeccion de claims por HTTP.

## 4. Resumen de verificacion

| Criterio | Estado |
| --- | --- |
| Criterio 1 | Cumplido |
| Criterio 2 | Cumplido |
