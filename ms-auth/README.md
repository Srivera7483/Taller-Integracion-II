# Microservicio de Autenticación

Microservicio responsable de validar credenciales y generar tokens JWT para el proyecto Taller de Integración II.

## Tecnologías

- Node.js
- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT
- Argon2
- Vitest
- pnpm

## Funcionalidad implementada

Se implementó el flujo de autenticación correspondiente a TAL-28:

- búsqueda de usuarios por correo electrónico;
- validación de contraseñas mediante hashes Argon2;
- generación de tokens JWT;
- payload limitado a `userId` y `role`;
- respuesta `200 OK` cuando el login es válido;
- respuesta `401 Unauthorized` cuando las credenciales son inválidas;
- validación del cuerpo con `class-validator`;
- acceso a PostgreSQL mediante Prisma.

## Estructura principal

```text
ms-auth/
├── prisma/
│   ├── migrations/
│   └── schema.prisma
├── src/
│   ├── auth/
│   │   ├── dto/login.dto.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.module.ts
│   │   ├── auth.service.spec.ts
│   │   └── auth.service.ts
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── app.module.ts
│   └── main.ts
├── .env.example
├── package.json
└── vitest.config.ts
```

## Modelos de datos

Los modelos de usuarios y roles están definidos en [prisma/schema.prisma](prisma/schema.prisma).

### Role

`Role` contiene el nombre y la descripción del rol. El nombre es único y un rol puede estar asociado con varios usuarios.

### User

`User` contiene un identificador UUID, correo único, contraseña almacenada como hash, nombre opcional, estado activo y una relación obligatoria con `Role` mediante `roleId`.

La relación permite recuperar el rol durante el login sin incluir información innecesaria en el token.

## Conexión a la base de datos

La conexión está encapsulada en [src/prisma/prisma.service.ts](src/prisma/prisma.service.ts). `PrismaService` hereda de `PrismaClient`, conecta en `onModuleInit`, libera la conexión en `onModuleDestroy` y registra el estado de la conexión.

La base de datos PostgreSQL está definida en el `docker-compose.yml` de la raíz. Para autenticación se utiliza el puerto local `5435`.

## Endpoint de autenticación

### `POST /auth/login`

Solicitud:

```http
POST /auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@test.com",
  "password": "pass123"
}
```

Respuesta exitosa (`200 OK`):

```json
{
  "accessToken": "<token-jwt>"
}
```

Las credenciales inexistentes o incorrectas producen `401 Unauthorized`. El servicio no revela si falló el correo o la contraseña.

## Payload del JWT

El token se firma exclusivamente con:

```ts
const payload = {
  userId: user.id,
  role: user.role.name,
};
```

No se incluyen contraseñas, correos electrónicos ni otros datos personales. La expiración está configurada en una hora.

## Variables de entorno

Copia `.env.example` como `.env` dentro de `ms-auth`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5435/auth_db
AUTH_PORT=3001
JWT_SECRET=super_secret_key_change_me
```

En producción, `JWT_SECRET` debe ser largo, aleatorio y administrado fuera del repositorio. No se debe publicar `.env`.

## Instalación y configuración

Desde `ms-auth`:

```bash
corepack pnpm install
corepack pnpm exec prisma generate
```

En Windows, si PowerShell bloquea `pnpm.ps1`, utiliza:

```powershell
pnpm.cmd install
pnpm.cmd exec prisma generate
```

También puedes habilitar scripts para el usuario actual:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

## Base de datos con Docker

Desde la raíz del repositorio:

```bash
docker compose up -d auth_db
```

Para aplicar migraciones:

```bash
cd ms-auth
corepack pnpm exec prisma migrate deploy
```

## Ejecución del servicio

```bash
corepack pnpm run start:dev
```

El servicio queda disponible en:

```text
http://localhost:3001
```

## Pruebas

El archivo [src/auth/auth.service.spec.ts](src/auth/auth.service.spec.ts) cubre:

1. login válido y generación del token;
2. rechazo de credenciales inválidas;
3. verificación de contraseña con Argon2;
4. payload `{ userId, role }`;
5. ausencia de firma cuando las credenciales fallan.

Ejecutar las pruebas:

```bash
corepack pnpm exec vitest run src/auth/auth.service.spec.ts --reporter=verbose
```

En Windows:

```powershell
.\node_modules\.bin\vitest.cmd run src/auth/auth.service.spec.ts --reporter=verbose --pool=threads --no-file-parallelism --maxWorkers=1
```

### Resultado comprobado

Después de generar Prisma, las pruebas se ejecutaron correctamente:

```text
Test Files  1 passed (1)
Tests       2 passed (2)
```

Casos verificados:

```text
✓ should return a JWT for a valid user and role
✓ should throw UnauthorizedException when credentials are invalid
```

También se verificó que los archivos principales no presentan errores de TypeScript en el editor.

## Problemas del entorno y solución

### PowerShell bloqueaba pnpm

Se solucionó utilizando `pnpm.cmd` o habilitando `RemoteSigned` para el usuario actual.

### Builds nativos bloqueados por pnpm

Prisma, Argon2 y esbuild requieren componentes nativos. Se configuró [pnpm-workspace.yaml](pnpm-workspace.yaml) con permisos explícitos:

```yaml
allowBuilds:
  '@prisma/client': true
  '@prisma/engines': true
  argon2: true
  esbuild: true
  prisma: true
```

### Cliente Prisma inexistente

El error `Cannot find module '.prisma/client/default'` se resolvió ejecutando:

```bash
pnpm exec prisma generate
```

### Vitest quedaba en estado `queued`

Se actualizó [vitest.config.ts](vitest.config.ts) para utilizar la resolución nativa de rutas de Vite y se ejecutó Vitest con un único worker en Windows.

## Scripts disponibles

```bash
pnpm run build       # compilar
pnpm run start       # iniciar
pnpm run start:dev   # iniciar en desarrollo
pnpm run test        # ejecutar pruebas
pnpm run test:e2e    # pruebas end-to-end
pnpm run test:cov    # cobertura
pnpm run lint        # linter
```

## Estado final

La autenticación está implementada y validada a nivel unitario. El microservicio dispone de modelos `User` y `Role`, conexión Prisma, endpoint `POST /auth/login`, comparación Argon2, firma JWT mediante variable de entorno, payload limitado, respuestas HTTP adecuadas y pruebas exitosas.

La validación contra una base de datos real requiere PostgreSQL levantado mediante Docker y usuarios existentes con contraseñas almacenadas como hashes Argon2.
