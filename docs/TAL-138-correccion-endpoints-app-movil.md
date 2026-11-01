# TAL-138: Correccion de endpoints para App Movil

## Resumen tecnico

Archivos modificados:

- `api gateway/index.js`: CORS global, preflight, fechas ISO 8601 y proxy de mantenimientos.
- `api gateway/index.test.js`: pruebas de CORS, ISO 8601 y mantenimientos.
- `docker-compose.yml`: carga de variables SMTP de notificaciones.
- `ms-notificaciones/Dockerfile`: imagen de ejecucion para el servicio JavaScript existente.
- `ms-notificaciones/pnpm-lock.yaml`: bloqueo sincronizado con `package.json`.

## CORS

El Gateway admite por defecto solicitudes sin origen (clientes nativos).
Los clientes Web deben declararse mediante `CORS_ALLOWED_ORIGINS`, separados por comas:

```text
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
```

Se permiten `GET`, `HEAD`, `POST`, `PUT`, `PATCH`, `DELETE` y `OPTIONS`.
Las cabeceras permitidas incluyen `Authorization`, `Content-Type`, `Accept` y
`X-Requested-With`; las cabeceras expuestas incluyen `Authorization` y `Content-Type`.

## Fechas

Las respuestas JSON del Gateway normalizan strings de fecha a UTC. Las fechas
devueltas cumplen `YYYY-MM-DDTHH:mm:ss.sssZ`, sin alterar el contrato ni exigir
cambios en los clientes Web.

## Compatibilidad Web

Se conserva la ruta `/api/v1/mantenimientos`. El campo de fecha se transforma
solo al serializar; la estructura, nombres de campos y rutas existentes no cambian.

## Prueba de CORS

```powershell
curl.exe -I -X OPTIONS http://localhost:3000/api/v1/incidencias `
  -H "Origin: http://localhost:5173" `
  -H "Access-Control-Request-Method: GET" `
  -H "Access-Control-Request-Headers: Authorization,Content-Type"

curl.exe -I http://localhost:3000/api/v1/incidencias `
  -H "Origin: http://localhost:5173" `
  -H "Authorization: Bearer TOKEN"
```

Ejemplo de respuesta JSON:

```json
{
  "id": 42,
  "estado": "ABIERTA",
  "createdAt": "2026-11-01T17:30:00.000Z",
  "updatedAt": "2026-11-01T17:30:00.000Z"
}
```
