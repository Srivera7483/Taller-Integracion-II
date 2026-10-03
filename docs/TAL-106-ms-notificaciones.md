# TAL-106: Inicialización de MS Notificaciones

## Alcance e implementación

- Se creó `ms-notificaciones/` como microservicio NestJS con módulo, controlador y servicio.
- `POST /notificar` acepta un payload JSON, registra el contenido con `console.log` como simulación del encolamiento y responde `201 Created` con `{ "status": "encolada" }`.
- Se añadió un Dockerfile multi-stage y el servicio `ms-notificaciones` al Compose global.
- El puerto `3004` del contenedor se publica en `127.0.0.1` del host, no en todas las interfaces de red.
- El API Gateway expone `POST /api/v1/notificaciones`, redirigiéndolo a `/notificar` en `MS_NOTIFICACIONES_URL`.

## Archivos principales

- NestJS: `ms-notificaciones/src/main.ts`, `ms-notificaciones/src/app.module.ts`, `ms-notificaciones/src/notificaciones/`.
- Contenedor: `ms-notificaciones/Dockerfile`, `ms-notificaciones/.dockerignore`, `docker-compose.yml`.
- Proxy: `api gateway/index.js`, `api gateway/index.test.js`, `api gateway/.env.example`.
- Guía y configuración: `.env.example`, `README.md`, `api gateway/README.md`, `ms-notificaciones/README.md`.

## Decisiones de arquitectura

La simulación por consola permite implementar y verificar rápido el contrato HTTP del MVP sin añadir la instalación, configuración y operación de RabbitMQ o Redis Streams. Reduce complejidad inicial, pero no brinda persistencia, reintentos ni garantía de entrega. Si esas garantías pasan a ser requisito, el servicio podrá integrar un broker en lugar de la simulación.

El API Gateway es el punto de entrada para clientes remotos y evita publicar el puerto del microservicio en interfaces externas. El binding de Docker a `127.0.0.1:3004` mantiene disponible la prueba local del servicio en la máquina de desarrollo sin abrir su puerto directamente a la red.

## Levantar y probar

Desde la raíz del repositorio:

```powershell
docker compose up -d --build ms-notificaciones
```

Prueba local del microservicio:

```powershell
$payload = @{ destinatario = "usuario-1"; mensaje = "Prueba local" } | ConvertTo-Json -Compress
$payload | curl.exe -i -X POST http://127.0.0.1:3004/notificar `
  -H "Content-Type: application/json" --data-binary "@-"
```

Prueba a través del Gateway:

```powershell
$payload = @{ destinatario = "usuario-1"; mensaje = "Prueba vía Gateway" } | ConvertTo-Json -Compress
$payload | curl.exe -i -X POST http://localhost:3000/api/v1/notificaciones `
  -H "Content-Type: application/json" --data-binary "@-"
```

Ambas peticiones deben responder `201 Created`. Para observar la simulación:

```powershell
docker compose logs -f ms-notificaciones
```

Verificación automatizada del proxy, desde `api gateway/`:

```powershell
npm.cmd test
```
