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
