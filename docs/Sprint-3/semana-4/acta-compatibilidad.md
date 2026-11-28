# Acta Final de Compatibilidad e Integración — Taller de Integración II y IV (`TAL-199`)

## 1. Propósito del Acuerdo
Consolidar **`openapi.yaml` (`v1.6.0`)** en la raíz del repositorio como única fuente de verdad contractual entre **Taller de Integración II (Backend, API Gateway y Web Admin)** y **Taller de Integración IV (Aplicación Móvil)**, garantizando compatibilidad de extremo a extremo sobre el `API Gateway (:3000)` sin romper los flujos existentes ni alterar el Diagrama MER Definitivo.

---

## 2. Acuerdos Técnicos Homologados y Verificados

### 2.1 Autenticación Dual y Renovación Móvil sin Cookies (`ms-auth`)
- **Rutas duales soportadas en Gateway y `AuthController`:**
  - `POST /api/v1/auth/login` y `POST /api/v1/autenticacion/inicio-sesion` (aceptan `email`/`password` o `correo`/`contrasena`).
  - `POST /api/v1/auth/refresh` y `POST /api/v1/autenticacion/renovar-token`.
  - `GET /api/v1/auth/me` y `GET /api/v1/autenticacion/usuario-actual`.
  - `POST /api/v1/auth/logout` y `POST /api/v1/autenticacion/cerrar-sesion`.
- **Flujo móvil (`X-Client-Type: mobile`):**
  - Clientes **Web**: reciben `refresh_token` exclusivamente en cookie `HttpOnly; SameSite=Strict` (protegido frente a XSS).
  - Clientes **Móviles**: al enviar la cabecera `X-Client-Type: mobile` en login, reciben `{ token, accessToken, refreshToken, usuario }` en el cuerpo JSON para persistirlo en almacenamiento seguro nativo y renovarlo enviando `{ "refreshToken": "<token>" }` a `POST /api/v1/auth/refresh`.
- **Listado paginado de usuarios con filtro por rol:**
  - `GET /api/v1/usuarios?page=1&limit=15&rol=TECNICO` (protegido por PBAC `usuarios:ver`), insensible a mayúsculas/minúsculas en el parámetro `rol`.

### 2.2 Validación de Códigos QR e Inventario (`ms-activos`)
- Búsqueda y lectura de activos autenticada para todos los actores operativos en `GET /api/v1/activos`, `GET /api/v1/activos/{id_activo}`, `GET /api/v1/activos/validar-qr?codigoQr=<qr>` y `GET /api/v1/activos/codigo-qr/{codigo_qr}`.
- Orígenes CORS habilitados en el API Gateway para entornos móviles híbridos (`capacitor://localhost`, `ionic://localhost`, `http://localhost:8081`, `http://localhost:19006`).

### 2.3 Ciclo de Vida de 4 Estados, Filtros y Clasificación de Incidencias (`ms-incidencias`)
- **4 estados oficiales unificados:** `1: Reportada` -> `2: Asignada` -> `3: Resuelta` | `5: Rechazada` (consultables en `GET /api/v1/estados-incidencia`).
- **Filtros combinables en `GET /api/v1/incidencias`:** `id_activo`, `id_estado`, `id_tecnico`, `id_reportante`, `prioridad` (`baja`, `media`, `alta`, `critica`), `pagina`/`page` y `limite`/`limit`.
- **Clasificación de prioridad dual:** soportada tanto en `PATCH /api/v1/incidencias/{id_incidencia}/prioridad` como en el alias móvil `PATCH /api/v1/incidencias/{id_incidencia}/clasificacion` bajo el permiso PBAC `incidencias:clasificar_prioridad`.
- **Evidencias fotográficas (RF4):** hasta `5` evidencias HTTPS de Cloudinary por incidencia (`POST /api/v1/incidencias/{id_incidencia}/evidencias`, respondiendo `409 Conflict` al exceder el tope).
- **Sincronización Offline en Lote (`TAL-192` / `TAL-193`):** `POST /api/v1/sincronizacion/lote` con soporte de éxito parcial aislado (`HTTP 200` / `HTTP 207 Multi-Status`) y detección de conflictos de concurrencia (`409`).

### 2.4 Esquema Estándar de Errores y Seguridad en Tiempo Real
- Respuestas de error unificadas con campos obligatorios `statusCode`, `mensaje`, `message`, `timestamp` y `path`.
- Handshake WebSocket (`Socket.io`) autenticado con JWT (`socket.handshake.auth.token`, `Authorization: Bearer` o `?token=`), rechazo `4401` ante tokens inválidos y aviso proactivo `token_expirado` 30 segundos antes del vencimiento.
