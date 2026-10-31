# TAL-169: Construcción de Páginas Globales de Error (404 / 500)

## 1. Información de la Tarea de Jira
* **Código:** TAL-169
* **Título:** Construcción de Páginas Globales de Error (404 / 500)
* **Responsable:** Benjamín Soto (Miembro 4 - Fullstack)
* **Sprint:** Sprint 2 (Semana 3 del Sprint / Semana 7 global)
* **Tiempo Total Estimado:** 1h 30m
* **Tiempo Total Imputado Sincero:** 1h 30m (`#time 1h 30m`)
* **Dependencias:** Router principal de React (`react-router-dom`) e Interceptor Axios (`AxiosInterceptor.jsx`)
* **Ubicación de Documentación:** `docs/Sprint-2/semana-3/TAL-169-paginas-globales-error.md`
* **Rama de Trabajo:** `feature/TAL-169-paginas-globales-error`

---

## 2. Objetivo General y Contexto
Prevenir que los usuarios del sistema (técnicos, coordinadores y administradores) se enfrenten a pantallas en blanco o mensajes técnicos crudos de Node.js / Fastify ante fallos de enrutamiento o caídas en la comunicación con los microservicios de backend.

Se implementaron vistas de error corporativas de primer nivel estético en Tailwind CSS (`NotFound.jsx` para errores HTTP 404 y `ServerError.jsx` para errores HTTP 500/502/503), asegurando navegación de rescate ininterrumpida, diagnóstico comprensible y reintento fluido sin pérdida de sesión.

---

## 3. Criterios de Aceptación y Cumplimiento Técnico

| Criterio de Aceptación Jira | Estado | Implementación Técnica |
| :--- | :---: | :--- |
| **1. Rutas inexistentes muestran página corporativa 404** | ✅ Cumplido | Se configuró la ruta comodín `<Route path="*" element={<NotFound />} />` en `App.jsx`. Al intentar ingresar a cualquier URL no mapeada (ej. `/ruta-invalida`), se renderiza una vista con tipografía moderna, insignia animada, visualización de la ruta consultada y botón destacado `"Volver al Inicio"`. |
| **2. Botón "Volver al Inicio" y accesos de rescate** | ✅ Cumplido | `NotFound.jsx` incorpora el botón principal hacia `/dashboard`, botón para regresar a la página anterior (`navigate(-1)`) y accesos directos hacia los módulos de Incidencias, Inventario y Mantenimientos. |
| **3. Captura y Redirección en Interceptor Axios (500 / Sin conexión)** | ✅ Cumplido | `AxiosInterceptor.jsx` evalúa si el backend retorna estados `5xx` (500, 502, 503, 504) o si la petición falla a nivel de red sin respuesta (`error.request`). En tales casos, notifica mediante Toast y redirige automáticamente hacia `/500`, preservando en el estado del router la ruta de origen (`from`) y el mensaje diagnóstico. |
| **4. Diagnóstico y Reintento en ServerError (500)** | ✅ Cumplido | `ServerError.jsx` desglosa el código HTTP, presenta un diagnóstico sugerido según el código (ej. microservicio inaccesible si es 502), checklist de verificación y botón interactivo `"Reintentar Conexión"` con estado de reconexión. |

---

## 4. Arquitectura y Componentes Desarrollados

### 4.1. Vista Corporativa 404: `NotFound.jsx`
* **Archivo:** `frontend-web/src/views/NotFound.jsx`
* **Características:**
  * Identidad gráfica institucional UCT (azul marino `#003366`, insignia SG).
  * Marca de agua 404 en escala de grises con icono animado `FiCompass`.
  * Visualizador de ruta dinámica mediante `useLocation().pathname`.
  * Botón interactivo `"Volver al Inicio"` (`FiHome`) y `"Regresar a la página anterior"` (`FiArrowLeft`).
  * Atajos rápidos a los módulos funcionales del sistema.

### 4.2. Vista Corporativa 500: `ServerError.jsx`
* **Archivo:** `frontend-web/src/views/ServerError.jsx`
* **Características:**
  * Indicador de estado en tono carmesí/rosado con icono animado `FiServer`.
  * Captura de parámetros transmitidos desde `location.state` (`status`, `message`, `from`).
  * Caja de diagnóstico sugerido para diferenciar caídas de microservicios (502 Bad Gateway) de mantenimiento (503) o excepciones de base de datos (500).
  * Botón `"Reintentar Conexión"` con animación de giro (`animate-spin`) que reintenta la navegación original o recarga la aplicación.
  * Botón `"Volver al Inicio"` para retornar al panel operativo sin quedar bloqueado.

### 4.3. Interceptor de Excepciones y Conectividad: `AxiosInterceptor.jsx`
* **Archivo:** `frontend-web/src/components/AxiosInterceptor.jsx`
* **Lógica Incorporada:**
  ```javascript
  // Detección de errores 5xx del backend
  if (error.response && error.response.status >= 500 && error.response.status < 600) {
    const errorMessage = error.response.data?.message || 'Error interno en los microservicios del sistema';
    showToast(errorMessage, 'error');
    if (location.pathname !== '/500') {
      navigate('/500', {
        state: { status: error.response.status, message: errorMessage, from: location.pathname }
      });
    }
  } else if (error.request) {
    // Servidor o API Gateway completamente apagado (Connection Refused / Network Error)
    showToast('Error de red: No se pudo contactar al servidor API Gateway', 'error');
    if (location.pathname !== '/500' && location.pathname !== '/login') {
      navigate('/500', {
        state: { status: 503, message: 'No se pudo establecer conexión con el API Gateway o microservicios.', from: location.pathname }
      });
    }
  }
  ```

### 4.4. Enrutamiento Principal: `App.jsx`
* **Archivo:** `frontend-web/src/App.jsx`
* **Configuración:**
  * Registro de rutas públicas de error: `<Route path="/500" element={<ServerError />} />` y `<Route path="/error" element={<ServerError />} />`.
  * Registro de ruta comodín: `<Route path="/404" element={<NotFound />} />` y `<Route path="*" element={<NotFound />} />`.

---

## 5. Verificación de Calidad y Tests

1. **Análisis Estático (Linter):**
   * Ejecución de `pnpm run lint` (`oxlint`): **0 errores** en los 48 archivos analizados del cliente web.
2. **Compilación de Producción:**
   * Ejecución de `pnpm run build` (`vite build`): Compilación completada con éxito en 830ms, generando los bundles minificados sin fallos de exportación ni rutas rotas.
3. **Validación de Rutas:**
   * Comprobación de que la ruta comodín `*` atrapa efectivamente rutas desconocidas y que `/500` es accesible globalmente sin requerir autenticación previa.

---

## 6. Desglose Sincero de Tiempos de Ingeniería (`#time 1h 30m`)

| Fase de Desarrollo | Duración | Detalle de Actividades |
| :--- | :---: | :--- |
| **1. Análisis de Requerimientos y Diseño Visual** | 20 min | Revisión de criterios de aceptación de TAL-169, diseño del layout corporativo de errores 404/500 y selección de paletas visuales. |
| **2. Construcción de `NotFound.jsx` (404)** | 25 min | Maquetación con marca de agua, captura de `location.pathname`, botones de rescate y enlaces directos a módulos. |
| **3. Construcción de `ServerError.jsx` (500)** | 25 min | Maquetación con indicador de servidor, caja de diagnóstico según código HTTP, botón de reintento y checklist de verificación. |
| **4. Integración en Router e Interceptor Axios y QA** | 20 min | Conexión de `useNavigate` en `AxiosInterceptor`, configuración de ruta comodín en `App.jsx`, verificación con `oxlint` (0 errores) y compilación Vite exitosa. |
| **Total Invertido Sincero** | **1h 30m** | **Coincidente con la estimación original de Jira** |
