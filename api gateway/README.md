# API Gateway

API Gateway construido con **Fastify**, **@fastify/http-proxy** y **dotenv**.

## Requisitos

- Node.js y npm instalados.

## Instalación

Desde esta carpeta (`api gateway/`), ejecutar:

```bash
npm install
```

## Variables de entorno

Copiar `.env.example` como `.env` y ajustar los valores si es necesario:

```env
GATEWAY_PORT=3000
NODE_ENV=development
MS_ACTIVOS_URL=http://localhost:3001
MS_INCIDENCIAS_URL=http://localhost:3002
MS_NOTIFICACIONES_URL=http://127.0.0.1:3004
```

`GATEWAY_PORT` define el puerto del servidor. Como compatibilidad, también se acepta `PORT`. Si ninguna está definida, se utiliza `3000`.

`MS_ACTIVOS_URL` y `MS_INCIDENCIAS_URL` definen los servicios destino de los proxies. Si el servicio de Activos no utiliza el puerto `3001`, cambia ese valor para no colisionar con MS Auth.
`MS_NOTIFICACIONES_URL` define el destino interno de las notificaciones; por defecto apunta a `127.0.0.1:3004`, expuesto sólo en loopback por Docker.
`GATEWAY_TRUST_PROXY` es opcional y acepta una IP/CIDR o una lista separada por comas con las direcciones de los proxies inversos confiables. Por defecto no se confía en cabeceras reenviadas. No lo configures como `true` si el Gateway también puede recibir tráfico directo no confiable.

## Ejecución

```bash
npm run dev
```

El servidor queda disponible en:

```text
http://localhost:3000
```

Desde PowerShell se puede usar `npm.cmd` si la política de ejecución bloquea `npm.ps1`:

```powershell
npm.cmd install
npm.cmd run dev
```

## Endpoint disponible

### `GET /`

Devuelve el estado básico del gateway:

```json
{
  "status": "OK"
}
```

Respuesta esperada: `200 OK`.

### `GET /api/activos/*`

Reenvía la petición a `MS_ACTIVOS_URL`.

### `GET /api/incidencias/*`

Reenvía la petición a `MS_INCIDENCIAS_URL`.

### `POST /api/v1/notificaciones`

Reenvía el cuerpo de la petición a `POST /notificar` en `MS_NOTIFICACIONES_URL`.

Si el destino no está disponible, el gateway responde `502 Bad Gateway` y permanece activo.

### `POST /api/v1/auth/login`

Reenvía el inicio de sesión a MS Auth y permite hasta **5 peticiones por IP en 15 minutos**. La sexta petición dentro de la ventana responde `429 Too Many Requests`. El límite sólo se aplica a esta ruta; las demás rutas no comparten esta cuota.

El Gateway utiliza la IP de la conexión como clave. Si hay un proxy inverso delante del Gateway, configura `GATEWAY_TRUST_PROXY` con la IP/CIDR exacta del proxy para que Fastify resuelva la IP real del cliente desde las cabeceras reenviadas de un emisor confiable.

## Verificación rápida

```bash
curl -i http://localhost:3000/
```

En PowerShell:

```powershell
curl.exe -i http://localhost:3000/
```

Para comprobar un proxy, el microservicio destino debe estar ejecutándose:

```bash
curl -i http://localhost:3000/api/activos
curl -i http://localhost:3000/api/incidencias
curl -i -X POST http://localhost:3000/api/v1/notificaciones \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@example.com","asunto":"Aviso","cuerpoMensaje":"Mensaje de prueba"}'
```

La solicitud válida de notificaciones responde `201 Created`. Si falta un campo requerido, el email no es válido o se envían propiedades adicionales, el microservicio responde `400 Bad Request`; el Gateway reenvía esa respuesta. Para ejemplos completos de validación por esta ruta, consulta [la guía TAL-107](../docs/TAL-107-validacion-payload-notificaciones.md).

## Resultado de la prueba

Se inició el servidor con `npm run dev` y se consultó `GET /`.

```text
HTTP/1.1 200 OK
{"status":"OK"}
```

La prueba confirmó que el servidor inicia correctamente y responde con el código HTTP y el JSON esperados.

## Prueba de límite de login

Con MS Auth y el Gateway en ejecución, envía seis solicitudes desde el mismo cliente:

```bash
for i in {1..6}; do
  status=$(curl -sS -o /dev/null -w "%{http_code}" \
    -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@test.com","password":"pass123"}')
  printf 'Intento %s: HTTP %s\n' "$i" "$status"
done
```

Las primeras cinco respuestas dependen de las credenciales (por ejemplo, `200` o `401`); la sexta debe ser `429`. Para repetir la prueba antes de que pasen 15 minutos, reinicia el Gateway para limpiar el contador en memoria.
