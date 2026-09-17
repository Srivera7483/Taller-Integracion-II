# API Gateway

Servidor base del API Gateway construido con **Fastify** y **dotenv**.

## Requisitos

- Node.js y npm instalados.

## Instalación

Desde esta carpeta (`api gateway/`), ejecutar:

```bash
npm install
```

También se pueden instalar explícitamente las dependencias con:

```bash
npm install fastify dotenv
```

## Variables de entorno

Copiar `.env.example` como `.env` y ajustar los valores si es necesario:

```env
PORT=3000
NODE_ENV=development
```

`PORT` define el puerto del servidor. Si no está definido, se utiliza el puerto `3000`.

## Ejecución

```bash
npm run dev
```

El servidor queda disponible en:

```text
http://localhost:3000
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

## Resultado de la prueba

Se inició el servidor con `npm run dev` y se consultó `GET /`.

```text
HTTP/1.1 200 OK
{"status":"OK"}
```

La prueba confirmó que el servidor inicia correctamente y responde con el código HTTP y el JSON esperados.
