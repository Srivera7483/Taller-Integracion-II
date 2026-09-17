# API Gateway

## Descripción

Este proyecto implementa un API Gateway con Node.js y Fastify. Su función es recibir el tráfico entrante y redirigirlo hacia los microservicios de MS Activos e Incidencias mediante rutas independientes.

**Políticas de Ramas (Branching Strategy):** La regla de oro escrita: prohibido hacer push directamente a main. Definir la nomenclatura de ramas, por ejemplo: 
- 1. Se crea la rama DEV para el testeo general entre codigos de los miembros del proyecto y convalidacion entre.
- 2. Acto seguido, utilizando como nucleo la rama DEV, Se crea el dev por integrante (Ejemplo: Benjamin-dev). Este es como el espacio individual de cada integrante posee para la verificacion y funcionalidad de cada tarea
- 3. Para terminar, utilizando como nucleo la rama dev-"Miembro", Se crean las ramas que contienen el desarrollo especifico de cierta tarea (Por ejemplo: puede ocupar el código de la tarjeta/tarea: ISBN1221. o el nombre directamente: formularios en frontend). Aclaracion sobre este punto: Es una rama distinta por tarea, osea que si tu tienes que realizar 5 tareas, tendras que crear 5 ramas que esten conectados hacia tu DEV individual.
- `/api/activos`: redirige las solicitudes a MS Activos.
- `/api/incidencias`: redirige las solicitudes a MS Incidencias.

## Manejo de Errores

Si un microservicio destino está apagado o inaccesible, el Gateway captura el error de red y devuelve de forma controlada una respuesta `502 Bad Gateway`. El servidor Gateway permanece activo y no se cae ante este tipo de fallos.

## Stack Tecnológico

- **Node.js:** entorno de ejecución del Gateway.
- **Fastify:** framework elegido por su alto rendimiento y mínima latencia.
- **@fastify/http-proxy:** proporciona el enrutamiento asíncrono y eficiente hacia los microservicios.
- **dotenv:** permite cargar y gestionar las variables de entorno definidas en `.env`.

## Ejecución

Desde la raíz del proyecto, ejecuta:

```bash
node index.js
```

El Gateway se iniciará en `http://localhost:3000`, según la configuración definida en `.env`.
