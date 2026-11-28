# TAL-179 — Vista de Bitácora de Auditoría y Estado de Servicios en Frontend

## Objetivo de la Tarea
Proveer en la aplicación Web Administrativa (`frontend-web`) una vista interactiva exclusiva para perfiles con permisos administrativos PBAC (`Auditoria.jsx`) que permita:

1. **Monitorear en vivo el estado de salud operativa** del API Gateway (`GET /api/v1/health`) y de los cuatro microservicios del Diagrama de Componentes (`ms-auth`, `ms-incidencias`, `ms-activos` y `ms-notificaciones`), mostrando estado (`UP`, `DEGRADED`, `DOWN`) y latencia en milisegundos.
2. **Inspeccionar la bitácora paginada de transacciones mutantes** (`POST`, `PUT`, `PATCH`, `DELETE`) expuesta por el API Gateway en `GET /api/v1/auditoria`, incorporando buscador y filtros reactivos (usuario responsable, microservicio destino, método HTTP y código de respuesta), refresco manual y maquetación responsiva (tabla en escritorio y tarjetas apiladas en móvil).
3. **Resguardar la ruta y la navegación mediante autorización granular PBAC** (`<ProtectedRoute requiredPermission={...} />` y `hasPermission(...)`), asegurando compatibilidad plena con el despliegue productivo en Kubero (sin direcciones `localhost` ni URLs fijas en los componentes, paginación acotada y compatibilidad con el build productivo de Vite y PWA).

---

## Registro Cronológico de Cambios por Archivo

- archivo modificado: `frontend-web/src/services/auditoriaService.js` — Creación del servicio dedicado de consumo, normalización y control PBAC para la vista de auditoría. Centraliza las llamadas HTTP a través de la instancia compartida `frontend-web/src/services/api.js` hacia `GET /auditoria` (con soporte de paginación acotada y filtros combinables: usuario, microservicio destino, método HTTP, código HTTP y búsqueda libre) y `GET /health` (con medición de latencia de ida y vuelta del API Gateway). Define la constante de permisos granulares `PERMISOS_AUDITORIA` (`['auditoria:ver', 'usuarios:gestionar', 'estadisticas:ver']`) alineada 1:1 con el contrato OpenAPI v1.6.0 y la validación del API Gateway, además de funciones puras de normalización de respuestas, catálogo descriptivo de los 4 microservicios (sin URLs directas ni referencias a `localhost`) y utilidades de clasificación visual semántica para estados de salud, métodos HTTP y códigos de respuesta.

- archivo modificado: `frontend-web/src/views/Auditoria.jsx` — Implementación de la vista interactiva administrativa dividida en dos bloques principales: (1) Monitor de Salud de Microservicios en vivo con resumen de telemetría del API Gateway (`GET /api/v1/health`: estado, latencia medida y uptime) y cuatro tarjetas de salud operativa para `ms-auth`, `ms-incidencias`, `ms-activos` y `ms-notificaciones` con estados `UP`/`DEGRADED`/`DOWN`, latencia en ms, código HTTP y filtro rápido al hacer clic; y (2) Bitácora de Transacciones con buscador libre y filtros reactivos por usuario responsable, microservicio destino, método HTTP (`POST`, `PUT`, `PATCH`, `DELETE`) y código de respuesta HTTP (exacto o por familia), maquetación responsiva (tabla en escritorio y tarjetas apiladas en móvil), paginación acotada (`10`, `20`, `50`), estados de carga mediante `SkeletonCard` y `SkeletonTable`, manejo controlado de errores o servicios temporalmente no disponibles, control anti-carreras para descartar respuestas obsoletas y botón de refresco manual.

- archivo modificado: `frontend-web/src/App.jsx` — Registro de la vista `Auditoria` mediante carga diferida (`React.lazy`) para conservar la división de bundles compatible con el build productivo de Vite y el precaché PWA, y exposición de la ruta `/auditoria` resguardada por `<ProtectedRoute requiredPermission={PERMISOS_AUDITORIA} />` para exigir autorización PBAC administrativa.

- archivo modificado: `frontend-web/src/components/Layout.jsx` — Integración del enlace de navegación `Auditoría` en el menú lateral (`allNavItems`) protegido con `requiredPermission: PERMISOS_AUDITORIA` (evaluado dinámicamente mediante `hasPermission(...)`) e incorporación del título contextual `Bitácora de Auditoría` en `getPageTitle()` para la ruta `/auditoria`.

- archivo modificado: `frontend-web/src/services/auditoriaService.js` — Corrección defensiva en `redondearMilisegundos`, `formatearDuracionUptime` y `normalizarSaludGateway` para rechazar valores `null`, `undefined` o cadenas vacías antes de su coerción numérica (`Number(null) === 0`), garantizando que la latencia y el uptime no disponibles se presenten siempre como `N/D` en vez de `0.0 ms` o `0s`.

- archivo modificado: `frontend-web/src/views/Auditoria.jsx` — Corrección de condición de carrera en la carga inicial bajo `React.StrictMode`: se reemplazó el marcado anticipado de la referencia antes de completar la solicitud por `saludInicialCargadaRef`, que solo pasa a `true` una vez recibida y aplicada efectivamente la telemetría de `servicios`, evitando que el doble montaje de desarrollo descarte la primera petición con `includeHealth=true` y deje el monitor de microservicios indefinidamente en estado de carga.

---

## Consideraciones de Despliegue (Kubero / Kubernetes) y Validación

- **Sin nuevas dependencias ni variables de entorno:** No se agregaron paquetes externos, puertos, volúmenes persistentes ni modificaciones en los comandos de compilación o arranque de `frontend-web`.
- **Consumo exclusivo mediante API Gateway:** Toda la comunicación se realiza a través de `frontend-web/src/services/api.js` hacia `/auditoria` y `/health`, sin URLs directas ni referencias a `localhost` dentro de `frontend-web/src/views/Auditoria.jsx` ni `frontend-web/src/services/auditoriaService.js`.
- **Paginación acotada y resiliencia:** Las consultas se limitan a páginas de `10`, `20` o `50` registros (con techo de seguridad en `100`), contemplando estados de carga (`SkeletonCard` / `SkeletonTable`), errores de autorización (`401`/`403`) y degradación o indisponibilidad temporal del API Gateway o cualquiera de los cuatro microservicios.
- **Validaciones ejecutadas en `frontend-web`:**
  - Análisis estático (`oxlint` sobre los 4 archivos creados/modificados): **0 errores y 0 advertencias**.
  - Compilación productiva (`pnpm run build` con Vite y `vite-plugin-pwa`): **exitosa**, generando el chunk diferido `Auditoria` y el Service Worker `dist/sw.js` sin conflictos de precaché.

---

## Comportamiento Esperado en la Bitácora: Inicio de Sesión (`LOGIN`) vs. Cierre de Sesión (`LOGOUT`)

Durante las pruebas funcionales de la vista `frontend-web/src/views/Auditoria.jsx`, es normal observar que las operaciones de inicio de sesión (`POST /api/v1/autenticacion/inicio-sesion` o `POST /api/v1/auth/login`) figuren con usuario `anonimo` y rol `ANONIMO`, mientras que las operaciones de cierre de sesión (`POST /api/v1/autenticacion/cerrar-sesion` o `POST /api/v1/auth/logout`) muestran correctamente el correo electrónico y rol del usuario autenticado. Este comportamiento **no corresponde a un error de la interfaz**, sino al diseño de seguridad definido en el API Gateway (`TAL-178`):

1. **Inicio de sesión (`LOGIN` registrado como `anonimo`):**
   - En el momento en que el cliente envía la solicitud de inicio de sesión, el navegador todavía no dispone de un token JWT de acceso en la cabecera `Authorization` ni en cookies.
   - En `api gateway/audit-logger.js`, la función `extractActor(request)` obtiene la identidad del actor (`sub`, `email`, `rol`) exclusivamente desde el JWT verificado de la petición entrante.
   - Conforme a las reglas de seguridad documentadas en `docs/Sprint-3/semana-4/TAL-178-auditoria-transacciones-gateway.md`, el API Gateway nunca inspecciona ni almacena el cuerpo (`body`) de las solicitudes HTTP (donde viajan las credenciales `correo` y `contrasena`), actuando como proxy en *streaming* sin leer datos sensibles. Al no existir un JWT en la petición entrante, el evento se registra intencionalmente con `id: "anonimo"`, `rol: "ANONIMO"` y `autenticado: false`.

2. **Cierre de sesión (`LOGOUT` registrado con correo y rol reales):**
   - Al solicitar el cierre de sesión, el usuario aún cuenta con su sesión activa en el cliente, por lo que el interceptor de `frontend-web/src/services/api.js` adjunta automáticamente la cabecera `Authorization: Bearer <token>`.
   - El API Gateway verifica criptográficamente ese token en la petición entrante y extrae sin inconvenientes el identificador, correo electrónico y rol del usuario responsable.

3. **Fidelidad de representación en el frontend:**
   - La vista `frontend-web/src/views/Auditoria.jsx` refleja de forma exacta los metadatos entregados por `GET /api/v1/auditoria`. En caso de requerirse a futuro que un evento `LOGIN` exitoso exponga también el correo y rol del usuario, dicha mejora correspondería a la capa del API Gateway (`api gateway/audit-logger.js`), por ejemplo leyendo un token emitido en cabeceras de respuesta sin inspeccionar nunca el cuerpo de la petición ni almacenar credenciales.
