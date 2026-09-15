**Contexto Institucional:** Nombre del proyecto, nómina de los 6 integrantes, roles asignados y semestre. Para mantener la coherencia administrativa, es útil especificar bajo qué lineamientos o competencias de su plan de estudios activo (malla vieja) se rige el entregable.

**Contrato Tecnológico:** La declaración explícita del stack unificado (React, NestJS, Prisma, PostgreSQL) para evitar desviaciones arquitectónicas durante las semanas de desarrollo.

**Guía de Arranque (Onboarding):** Comandos exactos para que cualquier integrante levante el proyecto tras clonarlo (ej. ejecutar docker-compose up -d, navegar a las carpetas e instalar dependencias).

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
