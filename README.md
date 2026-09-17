# API Gateway

## Descripción

Este proyecto implementa un API Gateway con Node.js y Fastify. Su función es recibir el tráfico entrante y redirigirlo hacia los microservicios de MS Activos e Incidencias mediante rutas independientes.

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
