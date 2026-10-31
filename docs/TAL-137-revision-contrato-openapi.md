# TAL-137: Revision del contrato OpenAPI

## Resumen tecnico

Archivos modificados:

- `api gateway/index.js`: publica Swagger UI en `/api/docs` y el contrato YAML en `/api/openapi.yaml`.
- `openapi.yaml`: contrato OpenAPI 3.0.3 usado por la app movil.
- `docs/TAL-137-revision-contrato-openapi.md`: documentacion tecnica de la revision.

## Contrato revisado

El alcance contractual se limita al backend HTTP implementado en este repositorio:
autenticacion, incidencias, trazabilidad, evidencias y ordenes de trabajo. No se
incluyen activos, roles administrativos, mantenimientos ni reportes porque esos
controladores no tienen una implementacion HTTP disponible.

Las rutas documentadas de autenticacion corresponden a la implementacion publica:

- `POST /api/v1/auth/login`: usa `email` y `password`; puede responder `200`, `400`, `401`, `429` y `500`.
- `POST /api/v1/auth/refresh`: obtiene la cookie HttpOnly `refresh_token` y devuelve `accessToken`.
- `GET /api/v1/auth/me`: obtiene el usuario autenticado.

El rate limit del Gateway permite 5 solicitudes en 15 minutos para login. El contrato incluye la respuesta estandar `429` y el encabezado `Retry-After`.

## Diagnostico del Paso 1

- Auth compila con `npm.cmd run build`.
- Incidencias compila con `npm.cmd run build`.
- El Gateway ejecuta 12/12 pruebas sin fallos.
- Swagger UI responde `200` en `http://localhost:3000/api/docs`.
- El contrato servido por el Gateway responde `200` en `http://localhost:3000/api/openapi.yaml`.
- Redocly valida `openapi.yaml` sin errores.

Incidencias y ordenes de trabajo mantienen sus rutas bajo `/api/v1/incidencias` y `/api/v1/ordenes-trabajo`, incluyendo:

- incidencias, estados, historial y evidencias;
- asignacion de ordenes, consulta por tecnico, consulta general y diagnostico;
- errores estandarizados `400`, `401`, `404`, `409`, `429` cuando aplica y `500`.

## Decision arquitectonica

Se mantiene el contrato YAML central como artefacto de integracion movil (Schema-First documental). Los controladores NestJS aun no incluyen `@nestjs/swagger`, por lo que la generacion dinamica no estaba disponible sin ampliar dependencias y decoradores. Un enfoque Code-First posterior reduciria la deriva entre DTOs y OpenAPI, pero requiere instalar Swagger y generar el documento desde el mismo codigo.

Los esquemas `Error`, `DatosInvalidos`, `NoAutenticado`, `DemasiadasSolicitudes` y `ErrorServidor` permiten que Flutter, React Native, Android e iOS procesen el mismo `statusCode`, `message`, `mensaje`, `timestamp` y `path`.

## Guia de validacion

1. Levantar Docker y Gateway:

```powershell
docker-compose up -d
cd "api gateway"
node index.js
```

2. Abrir Swagger UI:

```text
http://localhost:3000/api/docs
```

3. Validar el contrato OpenAPI 3.0:

```powershell
npx.cmd --yes @redocly/cli lint openapi.yaml
```

4. Comprobar la entrega YAML por HTTP:

```powershell
curl.exe -i http://localhost:3000/api/openapi.yaml
```
