# TAL-199: Homologación de Contrato OpenAPI v1.6.0 con Taller de Integración IV

## Resumen de Acuerdos Implementados

1. **Renovación de sesión móvil sin cookies (`ms-auth` + `api gateway`):**
   - `POST /api/v1/auth/login` acepta el header opcional `X-Client-Type: mobile` (insensible a mayúsculas). Cuando está presente, incluye `refreshToken` (vigencia `7d`) en la respuesta JSON además de emitir la cookie `HttpOnly`. Para clientes web (sin ese header), `refreshToken` sigue omitiéndose del JSON.
   - `POST /api/v1/auth/refresh` recibe el refresh token vía cookie `refresh_token` o vía cuerpo JSON `{ "refreshToken": "..." }`, emitiendo un nuevo `accessToken` (`15m`) y `permissions`.
   - Se incorporó `X-Client-Type` en `allowedHeaders` de `api gateway/src/config/cors.config.ts`.

2. **Alias `/clasificacion`, ampliación de `titulo` a `255` y `comentario` en `HISTORIAL_ESTADOS` (`ms-incidencias`):**
   - `IncidenciasController.clasificarPrioridad` expone `PATCH /incidencias/:id_incidencia/prioridad` y su alias `PATCH /incidencias/:id_incidencia/clasificacion` (soportando `baja`, `media`, `alta`, `critica` y sin bloqueo `409` al asignar técnicos sin clasificación previa).
   - Se amplió `INCIDENCIAS.titulo` a `VARCHAR(255)` (`CrearIncidenciaDto` `@MaxLength(255)` + `schema.prisma`) y se agregó la columna opcional `HISTORIAL_ESTADOS.comentario` (`VARCHAR(500)`) para trazabilidad RF6 mediante la migración `20261126150000_tal_199_titulo_255_y_comentario_historial`.
   - `PATCH /incidencias/:id_incidencia/estado` acepta `comentario` opcional (con fallback retrocompatible a `motivo_rechazo`), lo persiste en `HISTORIAL_ESTADOS` y `GET /incidencias/:id_incidencia/historial` lo retorna en cada evento.

3. **Contrato canónico `openapi.yaml` (`v1.6.0`):**
   - Actualizado en la raíz del repositorio documentando todos los cambios anteriores, además de `GET /usuarios` paginado y `PrioridadIncidencia` (`critica` incluida).

## Datos de Prueba para App Móvil (Semilla `seed.cjs`)

- **Usuarios de prueba (contraseña `password123`):**
  - `ADMINISTRADOR`: `administrador@uct.cl`
  - `SUPERVISOR`: `supervisor@uct.cl`
  - `TECNICO`: `tecnico@uct.cl`
  - `REPORTANTE`: `reportante@uct.cl`
- **Activos de prueba con `codigo_qr`:** `UCT-PRJ-01`, `UCT-PC-01`, `UCT-SW-01`.
- **URL pública HTTPS del API Gateway:** Pendiente de publicación en despliegue Kubero (`TAL-213`).
