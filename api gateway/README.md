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
```

`GATEWAY_PORT` define el puerto del servidor. Como compatibilidad, también se acepta `PORT`. Si ninguna está definida, se utiliza `3000`.

`MS_ACTIVOS_URL` y `MS_INCIDENCIAS_URL` definen los servicios destino de los proxies. Si el servicio de Activos no utiliza el puerto `3001`, cambia ese valor para no colisionar con MS Auth.

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

Si el destino no está disponible, el gateway responde `502 Bad Gateway` y permanece activo.

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
```

## Resultado de la prueba

Se inició el servidor con `npm run dev` y se consultó `GET /`.

```text
HTTP/1.1 200 OK
{"status":"OK"}
```

La prueba confirmó que el servidor inicia correctamente y responde con el código HTTP y el JSON esperados.
