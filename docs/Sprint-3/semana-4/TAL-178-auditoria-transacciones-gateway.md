# TAL-178 — Capa de Registro de Auditoría de Transacciones en API Gateway

## 1. Objetivo y Alcance
Implementar la trazabilidad estructurada de todas las transacciones mutantes (`POST`, `PUT`, `PATCH`, `DELETE`) procesadas a través del **API Gateway (`Fastify :3000`)**, exponiendo el endpoint administrativo `GET /api/v1/auditoria` protegido mediante **PBAC** junto con el chequeo de salud en tiempo real de los microservicios, respetando íntegramente el **Diagrama MER Definitivo**, el contrato **OpenAPI (`v1.6.0`)** y las restricciones de despliegue productivo en **Kubero (Kubernetes)**.

---

## 2. Arquitectura Compatible con Kubero (Kubernetes)

Siguiendo los lineamientos de infraestructura para contenedores efímeros y *read-only rootfs* en Kubero:

1. **Cero dependencia de archivos locales persistentes:**
   - No se escribe ningún archivo `.jsonl` ni bitácora en el sistema de archivos del contenedor.
2. **Doble vía asíncrona no bloqueante (`< 2 ms` de sobrecarga):**
   - **Salida estándar estructurada (`stdout`):** cada evento mutante se emite mediante `fastify.log.info({ audit: entry }, ...)` en formato JSON estructurado para su captura nativa desde el visor de logs de Kubero / Kubernetes.
   - **Integración con `RabbitMQ` (`auditoria.queue`) sin nuevas dependencias:** el Gateway despacha asíncronamente en *fire-and-forget* (`queueMicrotask` + `AbortSignal.timeout`) el contrato `AuditoriaEventoDto` hacia `POST ${MS_NOTIFICACIONES_URL}/eventos/auditoria`, el cual publica en el exchange `uct.activos.events` con *routing key* `auditoria.registro` hacia la cola durable `auditoria.queue` (con respaldo `uct.dlx` -> `dead-letter.queue`).
   - **Tolerancia a fallos:** si `RabbitMQ` o `ms-notificaciones` sufren desconexiones temporales, la excepción se aísla sin bloquear el *event loop* ni provocar caídas en el API Gateway.
3. **Conservación y consulta acotada para `TAL-179` (`AuditLogger` Ring Buffer):**
   - Dado que una cola AMQP no es una base histórica consultable y el MER oficial no debe alterarse con tablas adicionales, `api gateway/audit-logger.js` mantiene un **buffer circular preasignado `O(1)` en memoria** con tope estricto (`500` entradas por defecto, techo máximo `5000`), evitando consumos ilimitados de RAM e informando explícitamente `almacenamiento_efimero: true` en la respuesta paginada.
4. **Cero direcciones `localhost` o puertos fijos y cero nuevas variables obligatorias:**
   - Reutiliza únicamente las variables existentes (`MS_AUTH_URL`, `MS_INCIDENCIAS_URL`, `MS_ACTIVOS_URL`, `MS_NOTIFICACIONES_URL`, `JWT_SECRET`). No requiere nuevos contenedores, volúmenes persistentes, puertos ni cambios en los comandos de arranque (`TAL-213`).
5. **Sanitización de credenciales y secretos:**
   - Nunca se inspeccionan ni almacenan cuerpos de solicitud (`password`, `contrasena`, `refreshToken`), cabeceras `Authorization` / `Cookie` / `x-admin-key`, y cualquier parámetro sensible en *query string* (`token`, `password`, `secret`, `key`, `code`) se redacta automáticamente como `[REDACTED]`.

---

## 3. Autorización PBAC y Contrato `GET /api/v1/auditoria`

- **Validación criptográfica y PBAC:** verifica la firma `HS256` del Access Token con `JWT_SECRET` (`401 Unauthorized` si falta, expiró o es un *refresh token*) y comprueba la presencia de permisos administrativos en el arreglo `permissions` del JWT (`usuarios:gestionar`, `estadisticas:ver` o `auditoria:ver`), respondiendo `403 Forbidden` con el esquema `Error` oficial de `openapi.yaml` ante accesos sin privilegios.
- **Paginación y filtros listos para `TAL-179`:**
  - `page` (por defecto `1`) y `limit` (por defecto `20`, máximo `100`).
  - Filtros combinables: `metodo`, `servicio`, `usuario`, `rol`, `accion`, `statusCode` (exacto o familia `2xx`/`4xx`/`5xx`/`error`/`exito`), `desde`/`hasta`, `search` y `includeHealth`.
- **Estado de salud de microservicios:** sondas HTTP concurrentes con timeout corto hacia `ms-auth`, `ms-incidencias`, `ms-activos` y `ms-notificaciones`, clasificando el ecosistema en `UP`, `DEGRADED` o `DOWN`.
