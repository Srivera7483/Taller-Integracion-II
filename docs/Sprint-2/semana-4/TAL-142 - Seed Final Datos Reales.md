
## Tarea de Jira
---
**Objetivo:** Mostrar un sistema "vivo" durante la presentación universitaria, evitando los típicos datos basura ("asdfg", "test1").

**Descripción:** Limpiar los scripts de Seed de Prisma (o crear un dump SQL de inicialización). El seed debe crear:

• 3 Administradores Reales y 5 Técnicos reales.
• 10 Computadores, 5 Proyectores (Equipamiento UCT) en salas reales del Campus San Francisco.
• 20 Incidencias históricas simuladas y sus comentarios.
        
- **Criterios de Aceptación:**
    1. Correr el comando de _seed_ deja la base de datos lista y reluciente para la Demo.
    2. Fechas de incidencias distribuidas razonablemente (no todas el mismo día).
        
- **Dependencias:** Estructura de BD final (TAL-12, TAL-116).

## Commit
---
##### Limpieza de seeds anteriores
- Se eliminaron `ms-auth/create-user.js` y `ms-activos/seed.ts`, y el `ms-incidencias/seed.ts` solo se encarga de la creación de estados.

##### Creación de seed centralizado nuevo
- Se creó el **seed.cjs** en la raíz del proyecto que pide con lo solicitado.

##### Arreglos en scripts Bash
- Se cambiaron los comandos de `start.ps1` para referenciar correctamente al nuevo conjunto de seeds.
- Se modificó en **start.ps1** la regla `$ErrorActionPreference` en la fase de Prisma para evitar que _warnings_ inofensivos abortaran la inicialización. Se reemplazó `prisma migrate deploy` por `prisma db push` para garantizar la creación segura y limpia de las tablas en un entorno volátil, y se actualizó la ruta del orquestador de datos al nuevo `seed.cjs`.

##### Arreglos en variables de entorno
- Borra las variables de BD del `.env.example` general. No van acá porque se gestiona por microservicio.
- Oculta username y password de `ms-incidencias/.env.example`
- Oculta username y password de `ms-activos/.env.example`