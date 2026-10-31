# TAL-131: Lógica Frontend para Renovar Tokens Caducados

## 1. Información de la Tarea de Jira
* **Código:** TAL-131
* **Título:** Lógica Frontend para renovar Tokens caducados
* **Responsable:** Benjamín Soto (Miembro 4 - Fullstack)
* **Sprint:** Sprint 2 (Semana 3 del Sprint / Semana 7 global)
* **Tiempo Total Estimado / Imputado:** 2h 30m (`#time 2h 30m`)
* **Dependencias:** TAL-125 (Endpoint backend de Refresh Token en `ms-auth`)
* **Ubicación de Documentación:** `docs/Sprint-2/semana-3/TAL-131-logica-frontend-renovar-tokens-caducados.md`
* **Rama de Trabajo:** `feature/TAL-131-logica-frontend-renovar-tokens-caducados`

---

## 2. Objetivo General y Contexto
Garantizar una experiencia de usuario ininterrumpida y segura en la aplicación web (`frontend-web`), evitando que los técnicos, coordinadores o administradores sufran cierres de sesión repentinos o pérdida de datos en formularios extensos debido a la expiración normal del Access Token JWT (configurado con una vida útil corta de 15 minutos por motivos de seguridad).

La solución implementa el patrón arquitectónico de **Renovación Silenciosa (*Silent Refresh*)** mediante un interceptor de respuesta en la instancia global de Axios (`api.js`). Si una petición a cualquier microservicio devuelve un error HTTP `401 Unauthorized`, el interceptor pausa la ejecución, solicita automáticamente un nuevo Access Token al endpoint `/auth/refresh` y reintenta la petición original con la nueva credencial de forma totalmente transparente para el usuario.

---

## 3. Criterios de Aceptación y Cumplimiento Técnico

| Criterio de Aceptación | Estado | Implementación y Mecanismo Técnico |
| :--- | :---: | :--- |
| **1. Renovación Silenciosa y Sesión Continua** | ✅ Cumplido | El usuario no es expulsado al login si su Access Token caduca mientras el Refresh Token siga vigente. El interceptor intercepta el 401, consulta `/auth/refresh` con `withCredentials: true`, almacena el nuevo token y reintenta la solicitud original resolviéndola con éxito (HTTP 200). |
| **2. Cierre y Redirección Forzosa al Expirar Refresh** | ✅ Cumplido | Si el Refresh Token también caducó (más de 7 días de inactividad) o es revocado por el backend, se rechaza la cola de peticiones, se limpian todas las claves de autenticación (`token`, `refreshToken`, `usuario`) en `localStorage` y se redirige al usuario a `/login?expirado=true`. |
| **3. Control de Concurrencia (Cola de Reintentos)** | ✅ Cumplido | Implementación de las variables `isRefreshing` y `failedQueue`. Si múltiples peticiones fallan simultáneamente con 401 (ej. carga inicial en paralelo de Activos, Incidencias y Notificaciones), solo se dispara **una única llamada** a `/auth/refresh`. Las demás peticiones se encolan en espera de la nueva credencial y se reanudan automáticamente al completarse. |
| **4. Exclusión de Endpoints de Autenticación** | ✅ Cumplido | Las rutas de autenticación pública (`/auth/login`, `/auth/register` y el propio `/auth/refresh`) están excluidas del mecanismo de reintento para prevenir bucles infinitos de redirección y permitir que el formulario muestre errores de credenciales inválidas. |
| **5. Feedback Visual Claro en el Login** | ✅ Cumplido | La vista `Login.jsx` detecta el parámetro de consulta `?expirado=true` y despliega un banner informativo contextual advirtiendo que la sesión caducó por inactividad. |

---

## 4. Arquitectura y Componentes Desarrollados

### 4.1. Interceptor de Renovación Silenciosa: `api.js`
* **Archivo:** `frontend-web/src/services/api.js`
* **Configuración Base:** Se habilitó `withCredentials: true` en la instancia de Axios para permitir la transmisión automática de cookies seguras `HttpOnly` (`refresh_token`) emitidas por `ms-auth` a través del API Gateway.
* **Flujo Operativo del Interceptor:**
  1. **Detección 401:** Al recibir un error `401`, comprueba que no sea una petición a rutas de auth y que no haya sido reintentada previamente (`_retry`).
  2. **Encolamiento Concurrente:** Si ya hay un refresco en progreso (`isRefreshing === true`), crea una promesa diferida (`failedQueue.push({ resolve, reject })`).
  3. **Llamada de Renovación:** Utiliza una instancia limpia de Axios para ejecutar `POST /api/v1/auth/refresh`, enviando tanto la cookie como el fallback en el cuerpo si existiera en `localStorage`.
  4. **Rotación y Reintento:**
     * Extrae el `accessToken` devuelto por el servidor.
     * Actualiza `localStorage.setItem('token', newAccessToken)`.
     * Despacha el evento global `token-renovado`.
     * Ejecuta `processQueue(null, newAccessToken)` para desbloquear las peticiones encoladas.
     * Reejecuta la petición original con `Authorization: Bearer ${newAccessToken}`.
  5. **Manejo de Fallo Crítico:** Si el refresco devuelve 401 (Refresh Token expirado), limpia el almacenamiento local, despacha el evento `sesion-expirada` y redirige a `/login?expirado=true`.

---

### 4.2. Módulo de Gestión de Sesión: `authService.js`
* **Archivo:** `frontend-web/src/services/authService.js`
* **Responsabilidad:** Centralizar la manipulación de credenciales en el cliente y desacoplar la lógica de almacenamiento de los componentes de interfaz.
* **Funciones Principales:**
  * `getAccessToken()`: Obtiene el token de acceso actual.
  * `getRefreshToken()`: Obtiene el refresh token si está disponible localmente.
  * `getUsuarioActual()`: Deserializa el objeto del usuario logueado.
  * `isAuthenticated()`: Valida rápidamente si el cliente cuenta con sesión activa.
  * `guardarSesion({ accessToken, refreshToken, usuario })`: Persiste tokens y datos del usuario, notificando cambios de estado.
  * `limpiarSesion()`: Borra íntegramente las credenciales locales.
  * `renovarTokenManualmente()`: Permite gatillar la renovación de forma explícita ante eventos específicos.
  * `cerrarSesion()`: Notifica al endpoint `/auth/logout` y limpia el almacenamiento.

---

### 4.3. Refinamiento del Interceptor Visual: `AxiosInterceptor.jsx`
* **Archivo:** `frontend-web/src/components/AxiosInterceptor.jsx`
* **Mejora introducida:** Se ajustó el filtro de errores para que los estados HTTP 401 que son resueltos de forma silenciosa por `api.js` no disparen alertas Toast intrusivas ni confusas al usuario en segundo plano. Únicamente se notifica cuando se trata de un error deliberado de credenciales erróneas en el inicio de sesión.

---

### 4.4. Notificación Contextual en Login: `Login.jsx`
* **Archivo:** `frontend-web/src/Login.jsx`
* **Mejora introducida:**
  * Captura del parámetro URL `expirado=true`.
  * Renderizado condicional de un banner en tono ámbar con icono `IoAlertCircleOutline` indicando: *"Tu sesión ha expirado por inactividad. Por favor, ingresa tus credenciales nuevamente."*
  * Almacenamiento seguro del `refreshToken` si es retornado en el payload de respuesta del login.

---

### 4.5. Limpieza de Sesión en Navegación: `Layout.jsx`
* **Archivo:** `frontend-web/src/components/Layout.jsx`
* Se actualizó la función `handleLogout` para limpiar exhaustivamente `token`, `refreshToken` y `usuario`, garantizando que ningún residuo de sesión quede en el navegador tras cerrar sesión.

---

## 5. Alineación con el Contrato OpenAPI (Formato en Español)

En cumplimiento con el contrato canónico del proyecto (`openapi.yaml` v1.1.0), los endpoints de autenticación fueron adaptados para utilizar la convención en español bajo el prefijo `/api/v1/autenticacion`, manteniendo soporte dual para máxima compatibilidad:

### 5.1. Mapeo de Endpoints
| Operación | Ruta OpenAPI Canónica (Español) | Ruta Legacy (Retrocompatibilidad) | Método HTTP |
| :--- | :--- | :--- | :---: |
| **Inicio de Sesión** | `/api/v1/autenticacion/inicio-sesion` | `/api/v1/auth/login` | `POST` |
| **Renovación Silenciosa** | `/api/v1/autenticacion/renovar-token` | `/api/v1/auth/refresh` | `POST` |
| **Usuario Autenticado** | `/api/v1/autenticacion/usuario-actual` | `/api/v1/auth/me` | `GET` |
| **Registro de Usuario** | `/api/v1/autenticacion/registro` | `/api/v1/auth/register` | `POST` |
| **Cierre de Sesión** | `/api/v1/autenticacion/cerrar-sesion` | `/api/v1/auth/logout` | `POST` |

### 5.2. Capa de Retrocompatibilidad y Tolerancia a Fallos
* **Frontend Web (`api.js`, `authService.js`, `Login.jsx`):** Todas las solicitudes apuntan prioritariamente a los endpoints canónicos en español. Si el servidor remoto o entorno de pruebas responde `404 Not Found` (debido a microservicios ejecutando versiones previas a la homologación), el cliente ejecuta inmediatamente un reintento transparente hacia la ruta legacy en inglés antes de propagar cualquier error.
* **API Gateway (`api gateway/index.js`):** Se registró la ruta proxy `/api/v1/autenticacion` con `rewritePrefix: '/autenticacion'` hacia el microservicio de autenticación (`ms-auth`), coexistiendo con la ruta `/api/v1/auth`.
* **Microservicio Auth (`ms-auth/src/auth/auth.controller.ts`):** Soporte multi-ruta mediante decoradores de arreglo en NestJS:
  * `@Controller(['auth', 'autenticacion'])`
  * `@Post(['login', 'inicio-sesion'])`
  * `@Post(['register', 'registro'])`
  * `@Get(['me', 'usuario-actual'])`

---

## 6. Verificación y Calidad de Código

### 6.1. Análisis Estático (Linter)
Ejecución del linter `oxlint` sobre el frontend:
```bash
> frontend-web@0.0.0 lint
> oxlint
Finished in 51ms on 47 files with 104 rules using 16 threads.
Found 0 errors.
```

### 6.2. Compilación de Producción (Vite Build)
Ejecución del empaquetado optimizado:
```bash
> frontend-web@0.0.0 build
> vite build
✓ 124 modules transformed.
dist/index.html                   0.76 kB │ gzip:   0.42 kB
dist/assets/index-BGHeSTnm.css   74.77 kB │ gzip:  12.03 kB
dist/assets/index-DW3kPsxx.js   553.05 kB │ gzip: 153.82 kB
✓ built in 1.39s
```
*Compilación finalizada exitosamente con 0 errores de empaquetado y tipos.*

### 6.3. Verificación de Pruebas Unitarias
* **API Gateway (`api gateway/index.test.js`):** 4/4 pruebas unitarias aprobadas (100%).
* **Microservicio Auth (`ms-auth` vitest):** 19 pruebas aprobadas, 6 archivos de test en verde.

---

## 7. Registro de Tiempos y Smart Commits
* **Commit Inicial (Implementación Core):**
  * **Tiempo Imputado:** 2 horas y 30 minutos (`#time 2h 30m`)
  * **Mensaje:** `TAL-131 #time 2h 30m feat(frontend): interceptor axios para renovacion silenciosa de tokens caducados y gestion de sesion`
* **Commit de Refactorización (Alineación OpenAPI):**
  * **Tiempo Real Incurrido:** 30 minutos (`#time 30m`)
  * **Mensaje:** `TAL-131 #time 30m refactor(auth): alinear rutas de autenticacion al contrato openapi en espanol con soporte dual`
