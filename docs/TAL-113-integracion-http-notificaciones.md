# TAL-113: Integración HTTP con MS Notificaciones

## Implementación

- `ms-incidencias` registra `HttpModule` de `@nestjs/axios` con un timeout de 3 segundos e inyecta `HttpService` en `IncidenciasService`.
- La creación envía `POST /notificar` después de que la transacción de creación e historial haya terminado correctamente.
- El cambio a `Resuelta` notifica tanto por la ruta de actualización de estado como por la ruta de resolución, también después del commit. No se reenvía la notificación por una actualización que no represente la transición a `Resuelta`.
- El payload satisface el DTO de TAL-107: `email`, `asunto` y `cuerpoMensaje`.
- El emisor de JWT incorpora `email`; el guard de `ms-incidencias` lo preserva para el servicio. Los tokens emitidos antes de este cambio deben renovarse. Si falta el claim, se registra una advertencia y no se intenta enviar un payload inválido.
- Se aceptan los roles `TECNICO` y `TÉCNICO` en las rutas de resolución y se normalizan diacríticos durante la validación de transición; el rol del usuario semilla de autenticación usa tilde.
- Se usa el correo del usuario autenticado que ejecuta la operación como destino: el reportante al crear y el técnico que resuelve al cambiar a `Resuelta`. El modelo de incidencias no conserva el correo del reportante ni tiene una consulta de perfil interservicios, así que notificar al reportante cuando otro usuario resuelve requiere una futura fuente de contacto o una integración adicional.
- Los errores HTTP se registran con el `Logger` de Nest y no alteran la incidencia persistida ni la respuesta original. La URL predeterminada es `http://ms-notificaciones:3004/notificar`; para ejecutar `ms-incidencias` directamente desde el host se puede establecer `MS_NOTIFICACIONES_URL=http://localhost:3004/notificar`.

## Archivos modificados

- `ms-incidencias/src/incidencias/incidencias.module.ts`: registro de `HttpModule`.
- `ms-incidencias/src/incidencias/incidencias.service.ts`: envíos tras las transacciones y manejo fail-silent.
- `ms-incidencias/src/incidencias/incidencias.controller.ts`: traspaso de correo y usuario autenticado.
- `ms-incidencias/src/auth/auth.types.ts`, `ms-incidencias/src/auth/jwt-auth.guard.ts`: transporte del claim `email`.
- `ms-auth/src/auth/auth.service.ts`: inclusión del correo del usuario en los nuevos JWT.
- `ms-incidencias/package.json`, `ms-incidencias/package-lock.json`, `ms-incidencias/yarn.lock`: dependencias `@nestjs/axios` y `axios`.
- Los controladores/servicio de órdenes y `ms-incidencias/src/app.module.ts`: correcciones de compilación existentes que bloqueaban la validación.
- `ms-incidencias/src/incidencias/incidencias.service.spec.ts` y pruebas del guard/JWT: cobertura de payload y resiliencia.

## Decisiones de arquitectura

### HTTP síncrono y fallo silencioso para el MVP

La llamada HTTP mantiene el MVP sencillo: no requiere operar un broker ni introducir esquemas de eventos, consumidores, dead-letter queues y reintentos. `ms-incidencias` espera la respuesta del servicio por un máximo de 3 segundos, pero el registro en la base de datos ya quedó confirmado antes de realizar la llamada.

La contrapartida es que el endpoint puede sumar hasta 3 segundos de latencia y que una caída de `ms-notificaciones` puede perder el aviso: se registra el error y no se persiste un mensaje para reintentar. Por ello, esta estrategia no garantiza entrega eventual; se acepta esa limitación en favor de que el fallo de notificación no revierta ni oculte una incidencia válida. Si la entrega fiable se vuelve requisito, conviene introducir un outbox transaccional y un consumidor/broker (RabbitMQ o Kafka), con reintentos e idempotencia.

### `@nestjs/axios`

`HttpModule` y `HttpService` siguen el patrón de módulos e inyección de dependencias de NestJS, facilitan sustituir el cliente por un mock en pruebas y permiten aprovechar la integración con RxJS y las capacidades estándar de Axios. La API nativa `fetch` no ofrece esa integración propia del framework; usar Axios directamente obligaría a gestionar su construcción/inyección por cuenta propia. La llamada convierte el observable del `HttpService` a promesa con `firstValueFrom` para mantener el flujo `async`/`await` del servicio.

## Guía de pruebas manuales

Requisitos: base de datos y `ms-auth` disponibles, `ms-notificaciones` en ejecución, variables de entorno de `ms-incidencias` configuradas (incluido `DATABASE_URL` y el mismo `JWT_SECRET` que usa autenticación), y un usuario válido con correo. Arranque el servicio de incidencias con el correo de destino que aparece en el JWT:

```powershell
docker compose up -d incidencias_db ms-notificaciones
$env:MS_NOTIFICACIONES_URL = "http://localhost:3004/notificar"
npm.cmd run start:dev --prefix ms-incidencias
```

La URL `http://ms-notificaciones:3004/notificar` es para procesos conectados a la red de Compose. Como el Compose actual no define un contenedor para `ms-incidencias`, el override a `localhost` permite la prueba cuando Nest se ejecuta directamente en Windows.

En otra consola, autentíquese y cree la incidencia. Reemplace la contraseña por una válida para el entorno:

```powershell
$login = @{ email = "usuario@empresa.com"; password = "CONTRASENA" } | ConvertTo-Json -Compress
$auth = Invoke-RestMethod -Method Post -Uri "http://localhost:3001/api/v1/auth/login" -ContentType "application/json" -Body $login
$token = $auth.token
$body = @{
  id_activo = [guid]::NewGuid().ToString()
  titulo = "Prueba de notificaciones TAL-113"
  descripcion = "Validar envío posterior al commit de la incidencia."
} | ConvertTo-Json
$incidencia = Invoke-RestMethod -Method Post -Uri "http://localhost:3002/api/v1/incidencias" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body $body
$incidencia
```

### 1. Creación y notificación

La llamada de creación debe responder `201 Created` con la incidencia. En otra consola:

```powershell
docker compose logs --tail 50 ms-notificaciones
```

La salida debe mostrar `Notificación encolada` con el mismo correo del JWT y el asunto `Nueva Incidencia Reportada: Prueba de notificaciones TAL-113`. Para probar el aviso de resolución, use una incidencia asignada y un token de un técnico en `PATCH /api/v1/incidencias/{id}/resolver`; la respuesta de resolución debe conservarse y los logs deben mostrar `Incidencia Resuelta: [Título]`.

### 2. Resiliencia con MS Notificaciones apagado

Detenga únicamente el receptor y repita la creación con otro título:

```powershell
docker compose stop ms-notificaciones
# Ejecutar de nuevo el bloque POST de creación anterior
```

La creación debe seguir respondiendo `201 Created`; `ms-incidencias` registrará `Error al notificar al usuario` y devolverá la incidencia sin propagar el error de conexión. Al finalizar:

```powershell
docker compose start ms-notificaciones
```
