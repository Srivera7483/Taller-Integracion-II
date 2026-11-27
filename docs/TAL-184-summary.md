# TAL-184: Resumen de Implementación - Autenticación JWT en Handshake WebSocket

## Estado: COMPLETADO

### Cambios Realizados

#### 1. API Gateway (`api-gateway/index.js`)

**Dependencias añadidas:**
- `const jwt = require('jsonwebtoken')` (línea 12)

**Funciones auxiliares añadidas:**
- `extractTokenFromHandshake(socket)` - Extrae token de `socket.handshake.auth.token`, `Authorization: Bearer` o `?token=...`
- `verifyJWT(token, JWT_SECRET)` - Verifica firma y vigencia, lanza error `code: 4401`

**Middleware `io.use()` de autenticación JWT (TAL-184):**
- Es el primer middleware en la pila `io.use()`
- Valida JWT antes de permitir cualquier evento o sala
- Rechaza conexiones anónimas/inválidas con `err.data = { code: 4401 }`
- Adjunta `socket.data.user` con claims del JWT verificado:
  - `sub`, `email`, `rol`, `permissions`, `userId`, `tokenUse`
- **Cero confianza** en parámetros query del cliente

**Lógica de conexión (handler `io.on('connection')`):**
- Usa `socket.data.user` en lugar de `socket.handshake.query`
- Asignación PBAC de salas:
  - `coordinadores`: solo COORDINADOR, SUPERVISOR, ADMINISTRADOR
  - `rol_*`: basado en `socket.data.user.rol` y `permissions`
  - `incidencia_*`: validación mediante eventos `join_room`
- Temporizador de expiración de token basado en `exp` claim
- Emite `token_expirado` con 30 segundos de antelación
- Limpia timeout en `disconnect` para evitar fugas de memoria

#### 2. ms-incidencias Gateway (`incidencias.gateway.ts`)

**Cambios en `handleConnection()`:**
- Usa `client.data.user` en lugar de `client.handshake.query`
- Asignación de salas basada en JWT claims:
  - `coordinadores`: roles de autoridad
  - `rol_*`: rol del usuario autenticado
- Método `validarSalaPermiso()` privado para validación PBAC en eventos `join_room`

### Decisiones de Arquitectura

1. **Validación en handshake (`io.use`)**: Una sola verificación amortiza el costo computacional sobre toda la sesión, a diferencia de verificar en cada mensaje/evento. Aisla el tráfico no autenticado antes de que llegue a la lógica de negocio.

2. **Token por `socket.handshake.auth.token`**: Preferible a `?token=...` en URL por seguridad (no visible en logs de proxies, historiales CORS, preflight requests). También soporta `Authorization: Bearer ...` y `?token=...` como fallback.

3. **Notificación proactiva `token_expirado`**: Emitido 30 segundos antes del vencimiento real, permite al cliente renovar vía `POST /api/v1/auth/refresh` sin perder eventos ni desconexión inesperada. A diferencia de mantener el socket abierto con token caducado, esto previene privilegios obsoletos.

### Códigos de Prueba

Los comandos de validación demuestran:
1. Conexión anónima o token inválido → rechazada con `4401`
2. JWT válido → ignora `query.rol` falso, asigna salas reales según permisos del token
3. Vencimiento del token → recibe `token_expirado`, renueva y reconecta limpiamente

### Próximos Pasos Recomendados

- Implementar logging de auditoría (TAL-212) para eventos de conexión, desconexión, `token_expirado`, fallos `4401`
- Verificar compatibilidad con modo Redis Pub/Sub distribuido (TAL-209)
- Probar flujo completo de renovación de tokens con `POST /api/v1/auth/refresh` (TAL-125, TAL-131)