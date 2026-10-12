# TAL-175: Saneamiento Técnico e Integración de Conexiones Backend-Frontend y Enrutamiento

## 1. Información de la Tarea de Jira
* **Código:** TAL-175
* **Título:** Saneamiento técnico e integración de conexiones Backend-Frontend y Enrutamiento
* **Responsable:** Benjamín Soto (Miembro 4 - Fullstack)
* **Sprint:** Sprint 2 (Semana 2 del Sprint)
* **Tiempo Total Estimado:** 3h
* **Ubicación Documentación:** `docs/Sprint-2/semana-2/TAL-175-saneamiento-tecnico-integracion.md`

### Objetivo General
Resolver las desconexiones arquitectónicas y cabos sueltos existentes entre el API Gateway, microservicios y el cliente web para asegurar la integridad de datos de extremo a extremo, eliminando el uso de mocks aislados y previniendo errores 404/400 entre componentes.

---

## 2. Implementación Paso 1 (Nivel 1: Enrutamiento, Contratos DTO y Seguridad JWT)
* **Tiempo imputado:** 40 minutos (`#time 40m`)

### 2.1. Habilitación de Proxy de Mantenimientos en API Gateway
* **Problema resuelto:** `ms-activos` exponía el endpoint de agendamiento de mantenimiento preventivo (`/api/v1/mantenimientos/planificar` - TAL-12), pero el API Gateway únicamente mapeaba `/api/v1/activos`, provocando que cualquier petición desde la web o cliente móvil resultara en `402 / 404 Not Found`.
* **Archivos modificados:**
  * `api gateway/index.js`: Se registró el proxy `@fastify/http-proxy` para `/api/v1/mantenimientos` apuntando a `MS_ACTIVOS_URL` (`http://localhost:3003`).
  * `api gateway/index.test.js`: Se incorporó la prueba unitaria automatizada que verifica la redirección hacia `/api/v1/mantenimientos`.
* **Verificación:** Ejecución de `node --test` con 100% de tests pasando (4/4).

### 2.2. Corrección de Enrutamiento y DTO en Asignación de Órdenes
* **Problema resuelto:** `ordenesService.js` apuntaba a una ruta inexistente en el Gateway (`/api/incidencias/ordenes-trabajo/asignar`) y enviaba nombres de campos desalineados con `AsignarOrdenDto` (`incidencia_id`, `tecnico_id`, `instrucciones`), los cuales eran descartados por la `ValidationPipe` con `whitelist: true`.
* **Archivos modificados:**
  * `frontend-web/src/services/ordenesService.js`:
    * Corrección de URL base dinámica hacia `/api/v1/ordenes-trabajo/asignar`.
    * Normalización del payload compatible con la DTO estricta del backend (`id_incidencia`, `id_tecnico`, `diagnostico_tecnico`), conservando propiedades retroactivas para evitar roturas.

### 2.3. Normalización de Datos y Métricas en Dashboard
* **Problema resuelto:** El microservicio de incidencias retorna la entidad estructurada con `id_incidencia`, `fecha_creacion` y el estado como objeto relacional `{ id_estado, nombre_estado }`. El Dashboard leía `row.id` y evaluaba `item.estado` como string plano, dejando todas las tarjetas métricas (resueltas, pendientes, críticas) en cero y con columnas vacías en la tabla.
* **Archivos modificados:**
  * `frontend-web/src/views/Dashboard.jsx`:
    * Desempaquetado seguro del nombre del estado (`item.estado?.nombre_estado` o string) en `resumenMetricas`.
    * Accesores seguros en la tabla para `id_incidencia` con truncado visual limpio y formateo de `fecha_creacion` con `toLocaleDateString()`.

### 2.4. Respeto Estricto de Variables de Entorno en JWT (ms-auth)
* **Problema resuelto:** `ms-auth` inicializaba `JwtModule.register` síncronamente al cargar el módulo antes de que `ConfigModule.forRoot()` cargara el archivo `.env`, forzando el secreto por defecto `'dev-secret-change-me'` e invalidando tokens si se configuraba un secreto personalizado.
* **Archivos modificados:**
  * `ms-auth/src/auth/auth.module.ts`: Migración a `JwtModule.registerAsync` inyectando `ConfigService` de forma asíncrona reactiva.
* **Verificación:** Ejecución de pruebas unitarias en `ms-auth` con Vitest pasando exitosamente.

---

## 3. Implementación Paso 2 (Nivel 2: Persistencia Real en Activos, Registro Web e Inventario Dinámico)
* **Tiempo imputado:** 1 hora 20 minutos (`#time 1h 20m`)

### 3.1. Conexión de Lectura y Validación a Base de Datos Prisma en `ms-activos`
* **Problema resuelto:** En el Sprint 2 (PR #99), se incorporó persistencia Prisma en PostgreSQL para `crearMantenimiento`, pero todos los métodos de consulta (`validarCodigoQR`, `obtenerPorId`, `listarTodos`, `obtenerEstadisticas`) seguían consumiendo un array en memoria estático (`activosEnMemoria = []`). Esto causaba que los activos creados o sembrados en base de datos nunca aparecieran en listados ni pudieran ser validados por QR o escáner móvil.
* **Archivos modificados:**
  * `ms-activos/src/activos.service.ts`:
    * `validarCodigoQR`: Consulta a `this.prisma.activo.findFirst` coincidiendo por `codigoQr` o `id`, manteniendo fallback seguro a memoria si la base de datos está offline.
    * `obtenerPorId`: Vinculación a `this.prisma.activo.findUnique({ where: { id } })`.
    * `listarTodos`: Vinculación a `this.prisma.activo.findMany({ orderBy: { fechaRegistro: 'desc' } })`.
    * `obtenerEstadisticas`: Cálculo dinámico de totales y agrupaciones por estado/categoría directamente contra Prisma.

### 3.2. Formulario de Registro Integral y Alineado en Frontend Web (`Login.jsx`)
* **Problema resuelto:** El microservicio de autenticación (`ms-auth` - TAL-109) define reglas de validación DTO estrictas para `POST /auth/register`, requiriendo obligatoriamente: `rut_o_id`, `nombre`, `apellido`, `email` institucional (`@uct.cl`) y `password`. El formulario en `Login.jsx` únicamente renderizaba los campos de correo y contraseña, enviando un payload incompleto que fallaba invariablemente con `400 Bad Request`.
* **Archivos modificados:**
  * `frontend-web/src/Login.jsx`:
    * Adición de campos para RUT/Identificador institucional, Nombre y Apellido en el modo de registro.
    * Validación proactiva en frontend de correo institucional `@uct.cl`.
    * Envío de payload completo y adaptado a `authService.register`.

### 3.3. Inventario Conectado a Datos Reales (`Inventario.jsx`)
* **Problema resuelto:** La vista de Inventario en el cliente web mostraba una constante estática fija (`EQUIPOS_BASE`), ignorando completamente la información proveniente del API Gateway (`/api/v1/activos`) y del microservicio de activos.
* **Archivos modificados:**
  * `frontend-web/src/views/Inventario.jsx`:
    * Implementación de consumo asíncrono con `api.get('/activos')`.
    * Normalización de estados enum (`OPERATIVO`, `EN_MANTENIMIENTO`, `EN_REVISION`, `DADO_DE_BAJA`) hacia etiquetas legibles.
    * Inclusión de estados de carga, botón de actualización en tiempo real y fallback resiliente para garantizar operatividad continua.
    * Vinculación de botones de acción hacia Trazabilidad (`/trazabilidad/:id`) y Reporte de Falla (`/incidencias/nueva?id_activo=...`) con los identificadores reales.

