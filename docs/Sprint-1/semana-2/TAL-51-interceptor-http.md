# TAL-51: Interceptor HTTP de retroalimentación UX

## 1. Información de la Tarea
- **ID:** TAL-51
- **Nombre:** Interceptor HTTP de retroalimentación UX
- **Objetivo:** Configurar el cliente HTTP (axios) para orientar al usuario en caso de errores de red o servidor en la aplicación mediante Toasts globales.

## 2. Diagnóstico previo

- Las peticiones HTTP en el frontend se realizaban de forma dispersa utilizando la API nativa `fetch`.
- Cada vez que se realizaba una petición, era responsabilidad del desarrollador escribir bloques `try/catch` extensos y manejar manualmente cada código de estado HTTP (ej. 401, 400, 500) para invocar notificaciones visuales (Toasts).
- Esto generaba código espagueti en componentes como `Login.jsx` y era altamente propenso a olvidos u omisiones de manejo de errores, degradando la experiencia de usuario (UX) si el servidor fallaba silenciosamente.

## 3. Implementación

Para asegurar un manejo robusto, escalable y centralizado, se integró la librería `axios` y se configuró un ecosistema de intercepción.

1. **Instancia central (`api.js`)**: Se configuró una instancia mediante `axios.create` fijando la URL base del Gateway/Backend obtenida de las variables de entorno de Vite (`VITE_API_URL`). Adicionalmente, se añadió un interceptor de peticiones (`request.use`) para inyectar automáticamente la cabecera `Authorization: Bearer <token>` en toda salida.
2. **Componente de Intercepción (`AxiosInterceptor.jsx`)**: Ya que `axios` opera por fuera del contexto React, se creó un componente de alto orden (HOC) puente que vive dentro del árbol de React. Este componente invoca al hook `useToast` para registrar un interceptor de respuestas (`response.use`) sobre la instancia global `api`.
3. **Flujo Reactivo**: El interceptor extrae dinámicamente el campo de mensaje desde el JSON estándar devuelto por el backend (`error.response.data.message` o `error.response.data.error`). Al detectar un status code de fallo (`4xx` o `5xx`), dispara automáticamente el componente Toast variante de error.
4. **Refactorización (`App.jsx` y `Login.jsx`)**: Se envolvió la app con `<AxiosInterceptor>` para activarlo globalmente. Se refactorizó `Login.jsx` reemplazando el largo y engorroso bloque de `fetch` por un simple `api.post()`, eliminando toda la lógica de gestión de errores local.

## 4. Archivos modificados o creados

- `frontend-web/package.json`: (MODIFICADO) Se instaló `axios`.
- `frontend-web/src/services/api.js`: (NUEVO) Instancia central configurada de Axios.
- `frontend-web/src/components/AxiosInterceptor.jsx`: (NUEVO) Puente reactivo entre Axios y el ToastContext.
- `frontend-web/src/App.jsx`: (MODIFICADO) Inyección del interceptor global.
- `frontend-web/src/Login.jsx`: (MODIFICADO) Refactorización hacia `axios`.

## 5. Flujo de Error (Ejemplo)

1. El usuario intenta iniciar sesión con una clave errónea en `Login.jsx`.
2. El componente ejecuta `await api.post('/auth/login', payload)`.
3. El backend (Gateway) retorna un `HTTP 401 Unauthorized` con el body `{"message": "Credenciales inválidas"}`.
4. El `AxiosInterceptor` captura la respuesta antes de que llegue a `Login.jsx`.
5. El interceptor extrae `"Credenciales inválidas"`, invoca `showToast('Credenciales inválidas', 'error')`, mostrando la alerta en pantalla roja.
6. El interceptor retorna una promesa rechazada que termina silenciosamente en el bloque `catch` del componente `Login.jsx`, sin necesidad de escribir la alerta manualmente.

## 6. Decisión arquitectónica

Se decidió estandarizar el cliente HTTP utilizando `axios` debido a su facilidad nativa y diseño basado en promesas para soportar Interceptores Globales y transformar automáticamente JSON.

### Motivos

- **Mantenibilidad:** Toda nueva vista que importe `api.js` posee por defecto inyección segura de token y un excelente sistema de notificaciones en caso de caída del servidor.
- **Consistencia Visual:** Se garantiza que cualquier error `4xx` y `5xx` de la API va a ser notificado al usuario con el mismo estilo (Toast de React), evitando depender de programadores individuales.
- **Reducción de Código (Spaghetti):** Las vistas y componentes ya no requieren largos bloques de gestión de errores, reduciendo el código repetitivo de UI.

### Alternativas consideradas

**Fetch Wrapper Global:** Se consideró desarrollar una función envoltorio personalizada (Custom Fetch) sobre el `fetch` nativo. Sin embargo, interceptar errores a nivel global y conectarlo a React obliga a escribir lógica compleja, validación de tipos, extracción manual de JSON y manejo de errores de red (timeout) que `axios` ya implementa industrialmente por defecto.

## 7. Guía de pruebas

Validación manual del interceptor global:

1. **Simular error de autenticación (4xx):** Intentar ingresar al Login con datos inválidos. El sistema debe lanzar un Toast de error rojo en la esquina, extrayendo el motivo exacto que haya emitido el servidor backend.
2. **Simular error de servidor (5xx / Red):** Apagar el servidor Backend (Gateway) e intentar realizar el login. El interceptor debe capturar la falla de conexión (`error.request`) y mostrar un Toast diciendo "Error de red: No se pudo contactar al servidor".

## 8. Resultado

- **Criterio 1:** Existe un interceptor global de respuestas HTTP en el frontend -> **Cumplido**.
- **Criterio 2:** Al detectar cualquier código 4xx o 5xx, extrae el mensaje de error del JSON estándar devuelto por el backend y dispara automáticamente el componente Toast variante error -> **Cumplido**.
