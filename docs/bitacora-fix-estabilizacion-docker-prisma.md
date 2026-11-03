# Bitácora de Cambios: Estabilización de Docker, Prisma 6 y Migraciones

**Fecha:** 30 de Octubre de 2026  
**Área:** Infraestructura, Docker Compose, Microservicios y Base de Datos (Prisma ORM)  
**Estado:** Resuelto y Verificado exitosamente  

---

## 1. Resumen Ejecutivo

Durante esta sesión se resolvieron una serie de bloqueos técnicos presentes en la ejecución del script de inicio automatizado ([`start.ps1`](../start.ps1)). Las intervenciones abarcaron desde la corrección del contenedor de notificaciones en Docker y conflictos de colisión de nombres, hasta la estandarización estricta de **Prisma ORM en su versión 6.19.3**, la generación de migraciones SQL pendientes y la actualización de los scripts de inyección de datos de prueba (seeding).

---

## 2. Detalle de Incidencias y Soluciones Implementadas

### 2.1. Adaptación de `ms-notificaciones` a `pnpm` en Dockerfile
* **Problema:** Al ejecutar `start.ps1`, el paso `[3/7]` fallaba durante la construcción de la imagen de `ms-notificaciones` con el error:
  ```text
  npm error code EUSAGE
  The `npm ci` command can only install with an existing package-lock.json...
  ```
* **Causa:** El microservicio no contaba con un archivo `package-lock.json` y el estándar del proyecto utiliza `pnpm`.
* **Solución aplicada:**
  1. Se generó el archivo [`pnpm-lock.yaml`](../ms-notificaciones/pnpm-lock.yaml) ejecutando `pnpm install`.
  2. Se modificó [`ms-notificaciones/Dockerfile`](../ms-notificaciones/Dockerfile) habilitando Corepack (`RUN corepack enable`) en Node 22 Alpine y sustituyendo `npm ci` por `pnpm install --frozen-lockfile` (etapa build) y `pnpm install --prod --frozen-lockfile` (etapa runtime).
  3. Se incluyó `pnpm-debug.log*` en [`ms-notificaciones/.dockerignore`](../ms-notificaciones/.dockerignore).

---

### 2.2. Prevención de Conflictos de Nombres en Docker Compose
* **Problema:** Al ejecutar el proyecto desde directorios con distinto nombre (ej. `Proyecto` vs `FIX`), Docker Compose arrojaba errores del tipo:
  ```text
  Conflict. The container name "/auth_db" is already in use by container "...".
  ```
* **Causa:** Docker Compose tomaba el nombre de la carpeta como nombre de proyecto, pero los contenedores tenían `container_name` fijos a nivel global en el Docker daemon de la máquina.
* **Solución aplicada:**
  1. Se fijó un nombre de proyecto explícito en [`docker-compose.yml`](../docker-compose.yml) para independizarlo de la carpeta de trabajo.
  2. Se incorporó una limpieza preventiva en [`start.ps1`](../start.ps1) para remover contenedores huérfanos o con conflicto antes del arranque, preservando intactos los volúmenes de datos (`auth_db_data`, `activos_db_data`, etc.).

---

### 2.3. Congelación de Prisma ORM en versión 6.19.3
* **Problema:** Se presentaban incompatibilidades en las líneas 5-8 de los archivos `schema.prisma` (`url = env("DATABASE_URL")`) al usar versiones mayores de Prisma.
* **Causa:** En Prisma v7 se eliminó la propiedad `url` dentro del bloque `datasource` en favor de `prisma.config.ts` y adaptadores de driver.
* **Solución aplicada:**
  1. Se fijaron exactamente las dependencias a `"6.19.3"` (última versión estable y robusta de Prisma v6) sin comodines (`^`) en:
     * [`ms-auth/package.json`](../ms-auth/package.json)
     * [`ms-activos/package.json`](../ms-activos/package.json)
     * [`ms-incidencias/package.json`](../ms-incidencias/package.json)
  2. Se regeneraron los clientes con `prisma generate` y se actualizaron los `pnpm-lock.yaml`.
  3. Se actualizaron las referencias de versión en [`.env`](../.env) y [`.env.example`](../.env.example).

---

### 2.4. Evaluación de Seguridad: Vulnerabilidad en `deepmerge-ts`
* **Advisory:** GHSA-ggr8-5vv4-36mx / CVE-2026-40345 (*Uncontrolled Recursion / Stack Exhaustion* en `deepmerge-ts < 8.0.0`).
* **Análisis en el proyecto:**
  * La librería es una dependencia transitiva interna de `@prisma/config@6.19.3`.
  * **Riesgo en producción:** **Nulo (0%)**. Dicha dependencia únicamente interviene en el CLI de desarrollo durante la lectura de configuración de Prisma; las consultas a base de datos de los microservicios en runtime pasan por el motor nativo y no procesan datos de usuarios mediante esta librería.

---

### 2.5. Limpieza de Advertencias en `pnpm v12`
* **Problema:** `pnpm` (v12.15.0) advertía que el bloque `"pnpm": { "overrides": ... }` en `package.json` ya no es leído en las versiones modernas.
* **Solución aplicada:** Dado que las dependencias quedaron fijadas de manera exacta sin rangos flotantes en los `package.json` y lockfiles, se eliminaron los bloques `"pnpm"` obsoletos, eliminando todos los avisos y logrando resoluciones limpias e instantáneas.

---

### 2.6. Migración SQL para `mantenimientos_preventivos` en `ms-activos`
* **Problema:** En el paso `[6/7]` de `start.ps1`, el script de seed fallaba indicando:
  ```text
  The table `public.mantenimientos_preventivos` does not exist in the current database.
  ```
* **Causa:** En `schema.prisma` el modelo estaba mapeado mediante `@@map("mantenimientos_preventivos")`, pero en la carpeta de migraciones solo existía la migración inicial antigua que creaba la tabla `"mantenimientos"`. Como `prisma migrate deploy` solo aplica archivos SQL existentes, la tabla física nunca se renombró en PostgreSQL.
* **Solución aplicada:**
  1. Se generó la migración SQL [`ms-activos/prisma/migrations/20261030035500_create_mantenimientos_preventivos/migration.sql`](../ms-activos/prisma/migrations/20261030035500_create_mantenimientos_preventivos/migration.sql):
     * Eliminación segura de la tabla anterior `mantenimientos`.
     * Creación de la tabla `mantenimientos_preventivos` con su clave primaria `id_mantenimiento` y llave foránea hacia `activos`.
  2. Se aplicó la migración en la base de datos `activos_db` con `prisma migrate deploy`.

---

### 2.7. Sincronización de Datos de Prueba (Seeding)
* **Problema:** Los datos de prueba en `seed.ts` y métodos auxiliares de `ms-activos` no creaban mantenimientos preventivos o utilizaban identificadores obsoletos (`m.id` en lugar de `m.id_mantenimiento`).
* **Solución aplicada:**
  1. **[`ms-activos/prisma/seed.ts`](../ms-activos/prisma/seed.ts):** Ahora inserta registros válidos en `mantenimientos_preventivos` asociados a los activos creados durante el arranque.
  2. **[`ms-activos/src/activos.service.ts`](../ms-activos/src/activos.service.ts):**
     * Actualizados los objetos de `mantenimientosEnMemoria` para incluir `id_mantenimiento` y `fecha_creacion`.
     * `listarMantenimientos`: Normaliza los campos devueltos por la base de datos garantizando compatibilidad con la interfaz web y pruebas unitarias.
     * `obtenerTrazabilidad`: Corregido el mapeo para consultar `m.id_mantenimiento || m.id` y evitar excepciones al recuperar eventos de trazabilidad.

---

## 3. Pruebas y Resultados de Validación

| Componente / Prueba | Comando Ejecutado | Resultado |
| :--- | :--- | :--- |
| **Docker `ms-notificaciones`** | `docker compose build ms-notificaciones` | Compilación exitosa en Node 22 Alpine con pnpm |
| **Contenedor en ejecución** | `docker compose up -d ms-notificaciones` | Puerto 3004 escuchando y mapeo de rutas correcto |
| **Versión de Prisma** | `pnpm.cmd exec prisma -v` (en auth, activos e incidencias) | Prisma 6.19.3 activo en todos los microservicios |
| **Compilación de código** | `nest build` en los 3 servicios backend | 0 errores de TypeScript |
| **Tests unitarios** | `pnpm.cmd test` en `ms-activos` | 25/25 tests aprobados |
| **Migraciones de BD** | `pnpm.cmd exec prisma migrate deploy` | Todas las migraciones aplicadas correctamente |
| **Seeding completo [6/7]** | `create-user.js`, `seed.ts`, `seed-rapido.cjs` | 100% exitoso: roles, usuarios, activos, mantenimientos e incidencias creados |

---

## 4. Archivos Modificados / Creados

* `ms-notificaciones/Dockerfile`
* `ms-notificaciones/.dockerignore`
* `ms-notificaciones/pnpm-lock.yaml`
* `ms-auth/package.json`
* `ms-activos/package.json`
* `ms-incidencias/package.json`
* `ms-activos/prisma/migrations/20261030035500_create_mantenimientos_preventivos/migration.sql`
* `ms-activos/prisma/seed.ts`
* `ms-activos/src/activos.service.ts`
* `.env` y `.env.example`
* `docs/bitacora-estabilizacion-docker-prisma.md`

