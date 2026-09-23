# Reporte de Estado y Salud del Proyecto
## Cierre Semana 1 (Rama: `dev`)

**Fecha de Reporte:** 22 de Septiembre de 2026  
**Revisor:** Benjamín Soto (`bsoto2025`)  

---

## 1. Visión General
Al finalizar la primera semana de iteración (Sprint 1), el proyecto **Taller de Integración II** cuenta con las bases de infraestructura y repositorios funcionales. Se unificaron los estándares de desarrollo en la rama `dev`, resolviendo incompatibilidades graves de código, versiones de dependencias y despliegue local que habían sido ingresadas por el trabajo en paralelo.

Actualmente, el ecosistema se compone de 3 áreas principales en desarrollo:
1. `ms-auth` (Microservicio de Autenticación)
2. `ms-incidencias` (Microservicio de Incidencias)
3. `frontend-web` (Cliente Web React/Vite)

A continuación, se detalla el estado exacto de cada módulo y los bloqueos existentes.

---

## 2. Errores Críticos y Sanación Aplicada (TAL-88)
Durante el cierre de esta iteración, se detectaron y sanearon múltiples incompatibilidades en la rama `dev` generadas por el trabajo en paralelo del equipo. Las correcciones aplicadas fueron:

* **Crash de Inicialización en MS-Auth:** Se corrigió la falta de inyección del `FastifyAdapter` en el `main.ts` y la evasión de tipos en `auth.service.ts` (`as any`) que rompían la seguridad del tipado de Prisma.
* **Conflictos de Prisma Client:** El módulo `ms-incidencias` estaba configurado con una versión incompatible (`6.4.0`) frente al ms-auth (`v5.22.0`). Se estandarizó la versión y se reparó el script roto de `postinstall`.
* **Caos en Gestores de Paquetes:** El frontend usaba `npm` y `ms-incidencias` usaba `yarn`. Se eliminaron los `package-lock.json` y `yarn.lock`, y se unificó todo el ecosistema bajo **`pnpm`**.
* **Fallas de Conexión en Frontend:** Se eliminó la URL harcodeada a `localhost:3001` en `Login.jsx` (que causaba errores 404), migrándolo al uso seguro de variables de entorno (`import.meta.env.VITE_API_URL`).
* **Pérdida de Datos Locales:** Se editaron los contenedores en `docker-compose.yml` para incluir volúmenes persistentes, garantizando que el equipo no pierda sus datos al bajar los contenedores.

---

## 3. Estado por Módulo

### 🟢 2.1. Microservicio de Autenticación (`ms-auth`)
**Estado: Completamente Operativo y Saneado**
* **Infraestructura:** Corre de manera estable usando **NestJS + Fastify**. Se resolvió el error crítico de inicialización (`FastifyAdapter`) que impedía levantar el proyecto.
* **Base de Datos:** La conexión a PostgreSQL (Puerto 5435) está implementada usando `Prisma ORM` (v5.22.0).
* **Modelado:** Entidades `User` y `Role` listas con UUIDs y relaciones 1:N probadas y tipeadas fuertemente.
* **Filtros Globales:** Filtro global de excepciones implementado, devolviendo estructuras JSON 100% predecibles para el frontend.

### 🟡 2.2. Microservicio de Incidencias (`ms-incidencias`)
**Estado: Incompleto / Bloqueado por Dependencias Locales**
* **Avances:** Se realizó la configuración base y se corrigió su archivo `package.json`. Se estandarizó para que utilice **`pnpm`** y la misma versión de **Prisma (v5.22.0)** que el resto del sistema, previniendo conflictos futuros.
* **Problema Actual:** El compañero responsable (Ediuh) no subió la inicialización de la conexión de Prisma (`PrismaClient`) ni el módulo correspondiente. Si bien el proyecto compila, la base de datos `incidencias_db` (Puerto 5434) definida en el `docker-compose` está vacía de tablas y no es accesible por el código actual.
* **Siguientes pasos:** El responsable debe implementar el `PrismaModule` y sus migraciones.

### 🟡 2.3. Cliente Web Frontend (`frontend-web`)
**Estado: Operativo pero con Deuda Técnica**
* **Avances:** Proyecto React inicializado con Vite. Rutas base como `Login.jsx` existen en el proyecto.
* **Correcciones Aplicadas:** 
  * Se migró la gestión de paquetes de `npm` a `pnpm`, limpiando el `package-lock.json` para estandarizar todo el repositorio.
  * Se eliminó el uso de URLs hardcodeadas (`http://localhost:3001`). Ahora el Login utiliza de forma segura la variable de entorno `VITE_API_URL` para conectarse al backend, permitiendo despliegues flexibles en el futuro.
* **Siguientes pasos:** Refinar la interfaz y conectar los flujos de autenticación una vez que los endpoints en `ms-auth` emitan JWTs válidos.

---

## 3. Infraestructura y DevOps (Docker)

**Estado: 🟢 Funcional**
* El archivo `docker-compose.yml` fue parcheado y saneado.
* **Volúmenes Persistentes:** Se agregaron mapeos de volúmenes locales (`auth_data`, `activos_data`, `incidencias_data`) para las tres bases de datos de PostgreSQL. Esto evita la pérdida de información cada vez que los contenedores se apagan, estabilizando el flujo de desarrollo de todos los miembros del equipo.

---

## 4. Conclusión y Recomendaciones para la Semana 2

La rama `dev` se encuentra ahora **estandarizada**. Para la **Semana 2**, se recomienda encarecidamente:

1. **Evitar divergencias en Gestores de Paquetes:** Todo el equipo debe utilizar **EXCLUSIVAMENTE `pnpm install`**. No usar `npm` ni `yarn` para evitar conflictos en los *lockfiles*.
2. **Priorizar el scaffolding de Incidencias:** Es crítico que el módulo de incidencias se conecte a su base de datos lo antes posible para no retrasar las integraciones del frontend.
3. **Comenzar con la Lógica JWT:** Sobre el `ms-auth`, el siguiente paso es la generación de validaciones de Login y la firma de Tokens para que el frontend empiece a validar rutas protegidas.
