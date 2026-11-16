# TAL-2: Sincronización WebSockets y Gateway en Tiempo Real

## 1. Objetivo
Habilitar la infraestructura base de comunicación en tiempo real (`Socket.io` / WebSockets) en el **API Gateway** y el puente de transporte hacia `ms-incidencias` para soportar eventos en vivo hacia el navegador a través del puerto unificado (`3000`).

---

## 2. Arquitectura Implementada

1. **Servidor Socket.io Unificado sobre Fastify (`api gateway/index.js`):**
   - `IoServer` (`socket.io@^4.7.5`) se enlaza directamente a `fastify.server` (servidor HTTP nativo de Fastify), compartiendo el puerto `3000` sin conflictos de puertos (`EADDRINUSE`) y manteniendo total retrocompatibilidad con `fastify.inject()` y las pruebas existentes (`TAL-4`, Rate Limiting, Heartbeat `TAL-180`).
   - Transportes habilitados: `['websocket', 'polling']` con `allowEIO3: true`.
2. **Política CORS Sincronizada (`getAllowedOrigins`):**
   - Valida orígenes tanto en la configuración del servidor como en el middleware de handshake `io.use(...)`, bloqueando orígenes no autorizados con `[Ciberseguridad - CORS] Origen no autorizado para Socket.io`.
3. **Gestión de Salas (*Rooms*) y Puente con `ms-incidencias`:**
   - Al conectarse, cada cliente se une a la sala general `'incidencias'` y a las salas indicadas en el query string (`incidencia_${id}`, `edificio_${id}`, `rol_${ROL}`, `'coordinadores'`).
   - Soporta eventos `join_room` y `leave_room` con confirmación (*ack*) y puenteo opcional hacia `ms-incidencias` mediante `socket.io-client`.
   - Expone `io.emitIncidencias(event, data)` y `io.emitToClient(socketId, event, data)`.
4. **Cierre Limpio de Descriptores sin Fugas de Memoria:**
   - En el evento `disconnect`, se invoca `socket.removeAllListeners()` liberando referencias y listeners asociados al descriptor.
   - En el hook `onClose` de Fastify, se desconecta el cliente puente upstream y se cierra la instancia `IoServer`.

---

## 3. Verificación y Criterios de Aceptación

- **CA-1 (Conexión WebSocket estable a través del entorno unificado):** Verificado mediante pruebas automatizadas en `api gateway/index.test.js` y `api gateway/test_tal2.js`.
- **CA-2 (Reconexión limpia y cierre de descriptores sin fugas de memoria):** Verificado comprobando la eliminación del socket en `app.io.sockets.sockets` y `socket.removeAllListeners()` tras `disconnect`.
