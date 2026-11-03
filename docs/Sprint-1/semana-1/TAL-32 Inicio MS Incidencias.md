
## Tarea en Jira
---
**Objetivo:** Configurar el proyecto, dependencias y levantar la conexión exclusiva del ORM hacia incidencias_db.

**Criterios de Aceptación:**
- Proyecto base levantado y respondiendo en su puerto respectivo (ej. 3002).
- Conexión del ORM validada contra el contenedor de PostgreSQL (incidencias_db).

**Notas / Dependencias:** Requiere "Configuración de servicios de BD en Docker" (Semana 1).


## Commit 0d51382
---
• Se creó el proyecto NestJS en el directorio dedicado (/ms-incidencias), escogiendo Yarn como gestor de paquetes (más estable que NPM en despliegue según Bluuweb) y CommonJS (un estándar).

• Se integró el ORM de NestJS, el cual se llama Prisma, y se configuró la URL del Docker Postgres Incidencias como URL de base de datos (puerto 5434 del sistema).

• Se probó la conexión con los comandos `yarn prisma db pull`, se probó una migración básica (creando un "model" en schema.prisma y ejecutando el comando correspondiente `yarn prisma migrate dev --name init`), y se probó ya la ejecución del proyecto NestJS en el navegador (comando `yarn start:dev`).

• Me tomó más tiempo del necesario por las lentas instalaciones de Prisma con Yarn, y por las diferencias de comandos entre una versión y otra del CLI de Prisma. Este último problema me llevó a usar la versión 6 de Prisma, que me permitió usar los comandos más recurrentes de Prisma en los tutoriales. (Los cambios de una versión y otra suelen referirse a la velocidad que cambios transcendentales para lo que sería nuestro proyecto).

• Dejé la carpeta de migraciones por constituir una buena práctica para ver historial de cambios.

• El comando para tener la BD al día es yarn prisma migrate dev, dentro del directorio de MS Incidencias.

Más información de este commit: [https://app.notion.com/p/Node-js-y-NestJS-Introducci-n-3decac128c2680eab767e78363bf2e5a?source=copy_link](https://app.notion.com/p/Node-js-y-NestJS-Introducci-n-3decac128c2680eab767e78363bf2e5a?source=copy_link)