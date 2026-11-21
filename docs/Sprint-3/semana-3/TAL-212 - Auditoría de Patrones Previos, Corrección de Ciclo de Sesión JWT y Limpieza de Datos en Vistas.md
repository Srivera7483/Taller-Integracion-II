

## Notas
---
### Problemas de autenticación y disparo de eventos relacionados
---
- **Bug del usuario fantasma `"Usuario"` (`isAuthenticated()`):**
    
    - `isAuthenticated()` solo hace `Boolean(getAccessToken())`. Si existe un `token` en `localStorage` (incluso vencido, corrupto o de una sesión vieja donde nunca se guardó o se borró la clave `usuario`), deja entrar al usuario a las rutas protegidas sin datos de perfil. Como el Header/Sidebar probablemente hace algo como `usuario?.nombre || 'Usuario'`, ahí aparece el infame `"Usuario"` sin permisos ni rol real.
        
    - Lo mismo pasa en `guardarSesion`: si `usuario` viene `null` o `undefined` en la respuesta, guarda el `token` igual, dejando un estado "medio autenticado" roto.
        
- **Falta de evento en `renovarTokenManualmente()` y `guardarSesion()`:**
    
    - En `renovarTokenManualmente()`, se actualiza el `token` en `localStorage` pero **no se dispara** `window.dispatchEvent(new Event('tecnico-cambiado'))` (o un evento unificado como `'sesion-actualizada'`), por lo que `Toast.jsx` / `useWebSocket` no se enteran de que cambió el token.
        
    - En `guardarSesion()`, el evento solo se dispara dentro del `if (usuario)`.
        
- **Sin verificación de expiración (`exp`) en `isAuthenticated()`:**
    
    - Si se cierra el proyecto y se vuelve a abrir horas después, `localStorage.getItem('token')` sigue ahí aunque el JWT haya expirado, dejando pasar a las vistas hasta que el primer request falle con 401.

### Problemas en views DetalleIncidencia y MantenimientoService
---
- Datos inventados si faltaban datos en mantenimiento en **DetalleIncidencia**.
- No se mostraban datos del activo hasta que se terminara la consulta a MS Activos, y no se mostraba el número de serie del activo que sí se mostraba en la lista de incidencias  en **DetalleIncidencia**.
- Mockeos si fallaba el `GET /mantenimientos` en  en **MantenimientoService**


## Commit 
---
- Sesión fantasma ("Usuario"), cierre real y renovación de token: isAuthenticated() validaba únicamente la presencia del string token en localStorage sin comprobar su expiración (exp) ni la existencia de un objeto usuario válido, mientras que el botón de cierre en **Layout.jsx** limpiaba localStorage manualmente sin invocar cerrarSesion() ni invalidar la cookie HttpOnly refresh_token en **auth.controller.ts** (ms-auth). Además, renovarTokenManualmente() y el interceptor 401 de **api.js** actualizaban el token sin emitir tecnico-cambiado, dejando desincronizados **Toast.jsx** y useWebSocket. Se endureció **authService.js** y el interceptor 401 de **api.js** para validar vigencia del JWT, exigir perfil de usuario real, purgar refreshToken/refresh_token y notificar cada cambio de sesión; se conectó **Layout.jsx** con cerrarSesion() y se actualizó **auth.controller.ts** para emitir y expirar la cookie refresh_token con Path=/ en login y logout.
    
- Permisos en JWT: Se verificó que ms-auth y **jwt-auth.guard.ts** firman y validan el arreglo permissions dentro del payload JWT estándar (legible en F12 pero protegido criptográficamente contra manipulación).
    
- Erradicación de mocks y detalle de activo (S/N): Se eliminó MANTENIMIENTOS_FALLBACK en **mantenimientosService.js** y los valores simulados de cierre en **DetalleIncidencia.jsx**. Asimismo, se implementó GET /api/v1/activos/:id_activo en **activos.controller.ts** (ms-activos, conforme a OpenAPI v1.2.0) y se resolvió la carga previa del activo en **DetalleIncidencia.jsx** para desplegar nombre, código QR y S/N desde el render inicial sin parpadeos.