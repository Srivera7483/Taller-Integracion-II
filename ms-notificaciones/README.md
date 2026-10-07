# MS Notificaciones

Microservicio NestJS que recibe `POST /notificar`, registra el payload con `console.log` para simular el encolamiento y responde `201 Created`.

## Ejecución local

```powershell
npm.cmd install
npm.cmd run start:dev
```

Escucha en `0.0.0.0:3004` por defecto; se puede cambiar con `PORT`.

## Docker Compose

Desde la raíz del repositorio:

```powershell
docker compose up -d --build ms-notificaciones
docker compose logs -f ms-notificaciones
docker compose stop ms-notificaciones
```

Compose publica el puerto del contenedor sólo en `127.0.0.1:3004`. El Gateway enruta `POST /api/v1/notificaciones` a `POST /notificar`.

## Pruebas manuales

Endpoint local:

```powershell
$payload = @{ email = "usuario@example.com"; asunto = "Prueba local"; cuerpoMensaje = "Contenido de prueba" } | ConvertTo-Json -Compress
$payload | curl.exe -i -X POST http://127.0.0.1:3004/notificar `
  -H "Content-Type: application/json" --data-binary "@-"
```

Vía API Gateway:

```powershell
$payload = @{ email = "usuario@example.com"; asunto = "Prueba vía Gateway"; cuerpoMensaje = "Contenido de prueba" } | ConvertTo-Json -Compress
$payload | curl.exe -i -X POST http://localhost:3000/api/v1/notificaciones `
  -H "Content-Type: application/json" --data-binary "@-"
```

El DTO valida que `email` tenga formato de correo y que `asunto` y `cuerpoMensaje` sean strings no vacíos ni compuestos únicamente por espacios en blanco. El `ValidationPipe` global rechaza propiedades no declaradas. Para ejemplos de éxito y errores 400, consulta [TAL-107](../docs/TAL-107-validacion-payload-notificaciones.md).

La simulación por consola reduce el coste y el tiempo de desarrollo del MVP, pero no ofrece persistencia ni reintentos. El Gateway es la única entrada para clientes remotos; Docker mantiene el puerto 3004 publicado sólo en loopback.
