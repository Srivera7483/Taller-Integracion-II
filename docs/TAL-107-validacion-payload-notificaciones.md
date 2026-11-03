# TAL-107: Estructura del payload y validación de correos

## Implementación

`POST /notificar` exige un cuerpo JSON con estos tres campos:

| Campo | Validación |
| --- | --- |
| `email` | Obligatorio, no vacío y con formato de correo válido (`@IsEmail`, `@IsNotEmpty`) |
| `asunto` | Obligatorio, string, no vacío y con al menos un carácter que no sea espacio en blanco (`@IsString`, `@IsNotEmpty`, `@Matches`) |
| `cuerpoMensaje` | Obligatorio, string, no vacío y con al menos un carácter que no sea espacio en blanco (`@IsString`, `@IsNotEmpty`, `@Matches`) |

`CreateNotificacionDto` define el contrato. El `ValidationPipe` global utiliza `whitelist`, `forbidNonWhitelisted` y `transform`: el payload se valida antes de llegar al controlador, los campos desconocidos también causan HTTP 400, y el controlador pasa al servicio el DTO tipado. Las solicitudes válidas conservan la respuesta `201 Created` y la simulación de encolamiento de TAL-106.

## Decisiones de arquitectura

Se eligió `class-validator` junto con el `ValidationPipe` nativo de NestJS porque el DTO decorado integra la definición del contrato y su validación en la capa HTTP ya usada por el servicio. Requiere poca configuración adicional, valida automáticamente las clases de los parámetros de NestJS y devuelve errores HTTP 400 sin lógica repetida en el controlador.

Alternativas como Zod o Joi ofrecen validación por esquemas explícitos y pueden resultar convenientes si se necesita compartir esquemas con clientes, validar estructuras no basadas en clases o reutilizar un estándar común entre servicios. Sin embargo, requieren conectar su esquema con el ciclo HTTP de NestJS (por ejemplo, mediante pipes/adaptadores propios o paquetes adicionales); para este DTO acotado, eso agrega integración sin una ventaja que el requisito demande.

| Alcance del pipe | Ventajas | Consideraciones |
| --- | --- | --- |
| Global | Un comportamiento uniforme en todas las rutas; evita que nuevos endpoints olviden validar; centraliza las opciones estrictas. | Un cambio de configuración afecta todas las rutas que reciben DTOs. Los parámetros que no usan clases DTO no obtienen validación automática de propiedades. |
| Por ruta/controlador | Permite activación gradual y reglas distintas cuando los contratos realmente difieren. | La configuración puede duplicarse y una ruta nueva puede quedar sin validar por omisión. |

El pipe global es apropiado aquí porque el servicio NestJS tiene un único endpoint. `whitelist` junto con `forbidNonWhitelisted` hace explícito el contrato estricto, en lugar de descartar silenciosamente propiedades inesperadas.

## Pruebas manuales a través del API Gateway

Iniciar `ms-notificaciones` en el puerto `3004` y el API Gateway en el puerto `3000`. Los siguientes escenarios pasan por la ruta pública `POST http://127.0.0.1:3000/api/v1/notificaciones`; el Gateway la reenvía al endpoint interno `POST /notificar`. En PowerShell, se usa `ConvertTo-Json` y stdin para evitar problemas de escape al pasar el cuerpo a `curl.exe`.

### 1. Payload válido — HTTP 201

```powershell
$payload = @{ email = "usuario@example.com"; asunto = "Aviso"; cuerpoMensaje = "Mensaje de prueba" } | ConvertTo-Json -Compress
$payload | curl.exe -i -X POST http://127.0.0.1:3000/api/v1/notificaciones `
  -H "Content-Type: application/json" --data-binary "@-"
```

Respuesta esperada:

```http
HTTP/1.1 201 Created
```

```json
{"status":"encolada"}
```

### 2. Email inválido — HTTP 400

```powershell
$payload = @{ email = "no-es-un-correo"; asunto = "Aviso"; cuerpoMensaje = "Mensaje de prueba" } | ConvertTo-Json -Compress
$payload | curl.exe -i -X POST http://127.0.0.1:3000/api/v1/notificaciones `
  -H "Content-Type: application/json" --data-binary "@-"
```

### 3. Campo obligatorio ausente — HTTP 400

Este ejemplo omite `asunto`:

```powershell
$payload = @{ email = "usuario@example.com"; cuerpoMensaje = "Mensaje de prueba" } | ConvertTo-Json -Compress
$payload | curl.exe -i -X POST http://127.0.0.1:3000/api/v1/notificaciones `
  -H "Content-Type: application/json" --data-binary "@-"
```

Omitir `cuerpoMensaje` produce igualmente HTTP 400.
