# TAL-28 - Desarrollo de firma y encriptacion de tokens JWT

## 1. Identificacion de la tarea

- **ID:** TAL-28
- **Nombre:** Desarrollo de firma y encriptacion de tokens JWT
- **Objetivo:** Programar la funcion en MS Autenticacion que genere el token seguro al validar un inicio de sesion.

## Como hacerlo funcionar

Preparar la base de datos y MS Auth desde PowerShell:

```powershell
docker compose up -d auth_db
Set-Location ms-auth
pnpm.cmd install
pnpm.cmd exec prisma generate
pnpm.cmd exec prisma migrate deploy
Copy-Item .env.example .env
pnpm.cmd run start:dev
```

Con un usuario existente en la base de datos, probar el login:

```powershell
curl.exe -i http://localhost:3001/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"<correo>","password":"<contrasena>"}'
```

La respuesta exitosa contiene `accessToken`. No se debe copiar un token real en la documentacion.

## 2. Criterios de aceptacion y verificacion

### Criterio 1

**Requisito:** El endpoint de autenticacion recibe credenciales, las valida contra la base de datos comparando el hash de la contrasena y retorna `200 OK`.

**Estado:**

- **No verificado**

**Evidencia:**

- `ms-auth/src/auth/auth.controller.ts`, endpoint `POST /auth/login` y `@HttpCode(HttpStatus.OK)`.
- `ms-auth/src/auth/auth.service.ts`, consulta `prisma.user.findUnique` y uso de `verify` de `argon2`.
- `ms-auth/test/app.e2e-spec.ts`, prueba HTTP de login con Prisma mockeado.

**Descripcion:**

La implementacion consulta el usuario y compara el hash antes de generar la respuesta `200`. La prueba HTTP confirma el flujo del endpoint, pero reemplaza Prisma por un mock; no existe evidencia de ejecucion contra una base PostgreSQL real.

### Criterio 2

**Requisito:** La respuesta exitosa incluye un token JWT firmado criptograficamente.

**Estado:**

- **Cumplido**

**Evidencia:**

- `ms-auth/src/auth/auth.service.ts`, llamada `this.jwtService.sign(payload)`.
- `ms-auth/src/auth/auth.module.ts`, configuracion de `JwtModule`.
- `ms-auth/test/app.e2e-spec.ts`, verificacion del token devuelto con `JwtService.verify`.
- Resultado ejecutado: login HTTP `200` y token verificable.

**Descripcion:**

El servicio firma el payload mediante `JwtService`. La prueba e2e verifico que el token devuelto puede ser validado con la configuracion de JWT del modulo.

### Criterio 3

**Requisito:** El payload del JWT contiene el ID del usuario y su rol, sin informacion sensible como contrasenas.

**Estado:**

- **Cumplido**

**Evidencia:**

- `ms-auth/src/auth/auth.service.ts`, payload con `userId` y `role`.
- `ms-auth/test/app.e2e-spec.ts`, aserciones de `userId`, `role` y ausencia de `password`.

**Descripcion:**

El payload enviado a `JwtService.sign` contiene `userId: user.id` y `role: user.role.name`. La prueba ejecutada confirmo ambos claims y verifico que no contiene `password`.

## 3. Archivos relacionados

- **Ruta:** `ms-auth/src/auth/auth.controller.ts`  
  **Relacion con el criterio:** Define `POST /auth/login` y el codigo HTTP `200`.

- **Ruta:** `ms-auth/src/auth/auth.service.ts`  
  **Relacion con el criterio:** Consulta usuarios, compara hashes y firma el payload.

- **Ruta:** `ms-auth/src/auth/auth.module.ts`  
  **Relacion con el criterio:** Configura `JwtModule`, secreto y expiracion.

- **Ruta:** `ms-auth/test/app.e2e-spec.ts`  
  **Relacion con el criterio:** Verifica el flujo HTTP de login y los claims del JWT.

## 4. Resumen de verificacion

| Criterio | Estado |
| --- | --- |
| Criterio 1 | No verificado |
| Criterio 2 | Cumplido |
| Criterio 3 | Cumplido |
