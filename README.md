# Taller de Integración II

## Descripción

El proyecto utiliza una arquitectura de servicios con Fastify como tecnología HTTP. El API Gateway está construido directamente con Fastify y el microservicio de autenticación utiliza NestJS sobre `FastifyAdapter`.

```text
Cliente
	|
	v
API Gateway :3000 (Fastify)
	|-- /api/activos      -> MS Activos
	|-- /api/incidencias  -> MS Incidencias
	|
MS Auth :3001 (NestJS + Fastify)
	|
PostgreSQL :5435 (auth_db)
```

Actualmente `ms-incidencias`, `frontend-web` y la implementación de MS Activos todavía no están disponibles en este workspace. El gateway puede iniciarse y responder `/`, pero sus rutas proxy requieren que los servicios destino estén ejecutándose.

|Comando|Función|
|-|-|
| ```docker compose up``` | Inicializar los contenedores
| ```docker compose up -d``` | Inicializar los contenedores en segundo plano
| ```docker compose down``` | Apagar los contenedores
| ``` docker exec -it <contenedor> psql -U postgres -d <base_de_datos>``` <br> <span style="color:gray">- Ejemplo: <code style="color:gray;">docker exec -it incidencias_db psql -U postgres -d incidencias_db</code> </span> | Abrir la consola Postgres para navegar por la base de datos (Terminal) <br><span style="color:gray"><code style="color:gray;">\dt</code> Ver todas las tablas <br><code style="color:gray;">\d mi_tabla</code> Ver una tabla</span>



**Políticas de Ramas (Branching Strategy):** La regla de oro escrita: prohibido hacer push directamente a main. Definir la nomenclatura de ramas, por ejemplo: 
- 1. Se crea la rama DEV para el testeo general entre codigos de los miembros del proyecto y convalidacion entre.
- 2. Acto seguido, utilizando como nucleo la rama DEV, Se crea el dev por integrante (Ejemplo: Benjamin-dev). Este es como el espacio individual de cada integrante posee para la verificacion y funcionalidad de cada tarea
- 3. Para terminar, utilizando como nucleo la rama dev-"Miembro", Se crean las ramas que contienen el desarrollo especifico de cierta tarea (Por ejemplo: puede ocupar el código de la tarjeta/tarea: ISBN1221. o el nombre directamente: formularios en frontend). Aclaracion sobre este punto: Es una rama distinta por tarea, osea que si tu tienes que realizar 5 tareas, tendras que crear 5 ramas que esten conectados hacia tu DEV individual.

## Servicios y puertos

| Componente | Tecnología | Puerto local | Carpeta |
|---|---|---:|---|
| API Gateway | Node.js + Fastify | 3000 | `api gateway/` |
| MS Auth | NestJS + Fastify + Prisma | 3001 | `ms-auth/` |
| Auth PostgreSQL | PostgreSQL | 5435 | Docker `auth_db` |
| Activos PostgreSQL | PostgreSQL | 5433 | Docker `activos_db` |
| Incidencias PostgreSQL | PostgreSQL | 5434 | Docker `incidencias_db` |

El gateway usa `MS_ACTIVOS_URL` y `MS_INCIDENCIAS_URL` para resolver sus destinos. Sus valores por defecto son `http://localhost:3001` y `http://localhost:3002`; si MS Auth utiliza el puerto `3001`, define explícitamente la URL de MS Activos para evitar esa colisión.

## Requisitos

- Node.js 20 o superior.
- npm para el gateway.
- Corepack/pnpm para `ms-auth`.
- Docker Desktop y Docker Compose para PostgreSQL.

## Arranque completo

### 1. Preparar variables de entorno

En PowerShell, desde la raíz:

```powershell
Copy-Item "api gateway/.env.example" "api gateway/.env"
Copy-Item "ms-auth/.env.example" "ms-auth/.env"
```

Revisa los valores de ambos archivos antes de iniciar los servicios. `JWT_SECRET` debe ser el mismo valor que utilizará la firma y validación de JWT, y en producción debe ser un secreto largo y aleatorio.

### 2. Iniciar PostgreSQL

```powershell
docker compose up -d auth_db
```

Para iniciar también las bases de los servicios todavía no implementados:

```powershell
docker compose up -d
```

### 3. Preparar y arrancar MS Auth

En una terminal:

```powershell
Set-Location ms-auth
pnpm.cmd install
pnpm.cmd exec prisma generate
pnpm.cmd exec prisma migrate deploy
pnpm.cmd run start:dev
```

MS Auth quedará disponible en `http://localhost:3001`.

### 4. Preparar y arrancar el API Gateway

En otra terminal:

```powershell
Set-Location "api gateway"
npm.cmd install
npm.cmd run dev
```

El gateway quedará disponible en `http://localhost:3000`.

### 5. Verificar los servicios

Gateway:

```powershell
curl.exe -i http://localhost:3000/
```

Respuesta esperada: `200 OK` con `{ "status": "OK" }`.

Login de autenticación:

```powershell
curl.exe -i http://localhost:3001/auth/login `
	-H "Content-Type: application/json" `
	-d '{"email":"admin@test.com","password":"pass123"}'
```

Ruta protegida:

```powershell
$token = "<accessToken-devuelto-por-login>"
curl.exe -i http://localhost:3001/auth/me `
	-H "Authorization: Bearer $token"
```

La ruta protegida debe devolver `200 OK`. Sin el header o con un token inválido debe devolver `401 Unauthorized`.

## Pruebas y comandos útiles

Desde `ms-auth/`:

```powershell
pnpm.cmd run build
pnpm.cmd run lint
pnpm.cmd test
pnpm.cmd run test:e2e
```

El e2e de HTTP utiliza `FastifyAdapter` y mockea Prisma para no depender de una base de datos durante la prueba. La validación de login real requiere PostgreSQL, migraciones y un usuario existente.

## Manejo de Errores

Si un microservicio destino está apagado o inaccesible, el Gateway captura el error de red y devuelve de forma controlada una respuesta `502 Bad Gateway`. El servidor Gateway permanece activo y no se cae ante este tipo de fallos.

## Stack Tecnológico

- **Node.js:** entorno de ejecución del Gateway.
- **Fastify:** framework elegido por su alto rendimiento y mínima latencia.
- **@fastify/http-proxy:** proporciona el enrutamiento asíncrono y eficiente hacia los microservicios.
- **dotenv:** permite cargar y gestionar las variables de entorno definidas en `.env`.
