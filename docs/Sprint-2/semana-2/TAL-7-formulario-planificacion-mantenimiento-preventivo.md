# TAL-7: Formulario Web de Planificación de Mantenimiento Preventivo

## 1. Información de la Tarea de Jira
* **Código:** TAL-7
* **Título:** Formulario web de planificación de mantenimiento preventivo
* **Responsable:** Benjamín Soto (Miembro 4 - Fullstack)
* **Sprint:** Sprint 2 (Semana 2 del Sprint)
* **Tiempo Total Estimado / Imputado:** 2h 30m (`#time 2h 30m`)
* **Ubicación de Documentación:** `docs/Sprint-2/semana-2/TAL-7-formulario-planificacion-mantenimiento-preventivo.md`
* **Rama de Trabajo:** `feature/TAL-7-formulario-planificacion-mantenimiento`

---

## 2. Objetivo General y Contexto
Permitir a los administradores, supervisores y coordinadores de soporte técnico calendarizar intervenciones de mantenimiento preventivo para los equipos tecnológicos del inventario desde una interfaz gráfica moderna, amigable y responsiva.

La solución se integra de extremo a extremo comunicando la aplicación cliente (`frontend-web`) con el microservicio de activos (`ms-activos`) mediante el API Gateway, aprovechando la persistencia en PostgreSQL con Prisma introducida en TAL-12 y las rutas proxy habilitadas en TAL-175.

---

## 3. Criterios de Aceptación y Cumplimiento Técnico

| Criterio de Aceptación | Estado | Implementación y Mecanismo Técnico |
| :--- | :---: | :--- |
| **1. Prohibición de fechas en el pasado** | ✅ Cumplido | Doble capa de validación:<br>1) Atributo nativo `min` en el input `datetime-local` calculado dinámicamente (`ahora + 5 min`).<br>2) Validación en JavaScript dentro de `validateField` y `handleSubmit` rechazando cualquier `fechaIngresada <= new Date()`.<br>3) Validación en backend en `ms-activos` (`fechaProgramada < ahora`). |
| **2. Validación de campos obligatorios** | ✅ Cumplido | Validación proactiva en cliente en tiempo real (`onBlur` y `onChange`) sobre `idActivo`, `fechaProgramada`, `tipo` y `descripcion` (mínimo 10 caracteres explicativos) con mensajes descriptivos bajo cada campo y bordes en tono carmesí (`rose-500`). |
| **3. Feedback visual y limpieza tras éxito** | ✅ Cumplido | Al recibir respuesta HTTP 201/200 del microservicio, se invoca `showToast` con alerta verde de confirmación, se reinician los estados del formulario mediante `handleReset()` y se redirige al usuario a la vista de Inventario. |
| **4. Selector dinámico de activos** | ✅ Cumplido | Consumo asíncrono del endpoint `GET /api/v1/activos` para poblar el dropdown con nombre, código QR y ubicación de cada equipo. Además, se soporta la precarga automática mediante parámetros URL (`?id_activo=...` o `?activo=...`), resolviendo el identificador al UUID correspondiente. |
| **5. Prevención de doble clic y estado de carga** | ✅ Cumplido | Control de bandera booleana `isSubmitting` que deshabilita los botones de acción e inputs, renderizando un spinner animado (`FiRefreshCw animate-spin`) con el texto "Agendando Mantenimiento...". |

---

## 4. Arquitectura y Componentes Desarrollados

### 4.1. Servicio Cliente: `mantenimientosService.js`
* **Archivo:** `frontend-web/src/services/mantenimientosService.js`
* **Responsabilidad:** Encapsular las peticiones HTTP hacia el API Gateway.
* **Métodos principales:**
  * `planificarMantenimiento(payload)`: Ejecuta `POST /api/v1/mantenimientos/planificar` con el contrato:
    ```json
    {
      "id_activo": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "fecha_programada": "2026-10-25T14:30:00.000Z",
      "tipo": "Preventivo",
      "descripcion": "Reemplazo de pasta térmica y limpieza de ventiladores.",
      "estado": "Pendiente"
    }
    ```
  * `fetchActivosParaMantenimiento()`: Ejecuta `GET /api/v1/activos` para poblar el catálogo de selección en tiempo real.

### 4.2. Componente Formulario: `PlanificarMantenimientoForm.jsx`
* **Archivo:** `frontend-web/src/components/PlanificarMantenimientoForm.jsx`
* **Características:**
  * **Sección 1 (Equipo e Identificación):** Dropdown dinámico con botón de actualización rápida y tarjeta con ficha técnica del equipo seleccionado (categoría, ubicación, número de serie).
  * **Sección 2 (Planificación Temporal y Clasificación):** Selector `datetime-local` con control de fechas pasadas y desplegable de tipos de servicio (`Preventivo`, `Calibración`, `Inspección Técnica`, `Limpieza de Hardware`, `Actualización de Firmware`, `Revisión Eléctrica`).
  * **Sección 3 (Alcance y Tareas):** Área de texto con contador de caracteres ingresados y requerimiento mínimo de 10 caracteres.
  * **Barra de Acciones:** Botón de retorno al inventario, botón para limpiar el formulario y botón principal con estados de carga.

### 4.3. Vista Principal y Enrutamiento
* **Vista:** `frontend-web/src/views/PlanificarMantenimiento.jsx`
  * Integra migas de pan interactivas (`Inventario / Planificación`), banner de contexto institucional y renderizado del formulario.
* **Enrutamiento:** `frontend-web/src/App.jsx`
  * Incorporación de las rutas protegidas:
    * `/mantenimientos/planificar`
    * `/mantenimientos/nuevo`
* **Detección de Título:** `frontend-web/src/components/Layout.jsx`
  * Mapeo de rutas que inician con `/mantenimientos` para desplegar el título dinámico `"Planificación de Mantenimiento Preventivo"` en el header principal.

### 4.4. Puntos de Entrada desde el Inventario
* **Archivo:** `frontend-web/src/views/Inventario.jsx`
  * **Barra superior:** Botón verde esmeralda *"Planificar Mantenimiento"* con ícono de calendario (`FiCalendar`).
  * **Tabla por equipo:** Botón de acción *"Mantenimiento"* en cada fila que navega a `/mantenimientos/planificar?id_activo={id}`, precargando el equipo seleccionado automáticamente.

---

## 5. Casos de Prueba y Verificación de Integración

### 5.1. Prueba de Validación de Fecha Pasada
1. Se seleccionó un activo del catálogo.
2. Se forzó una fecha anterior al día actual.
3. **Resultado:** El componente impidió el envío, marcó el input en rojo y mostró el mensaje de error: *"No se puede agendar un mantenimiento con fecha en el pasado."*

### 5.2. Prueba de Envío con Datos Válidos
1. Se seleccionó el equipo `Proyector Láser Epson PowerLite` (`ACT-2026-0001`).
2. Se estableció la fecha para una semana posterior en horario hábil.
3. Se seleccionó el tipo `"Preventivo"` y se ingresaron las tareas a realizar.
4. Se presionó *"Agendar Mantenimiento"*.
5. **Resultado:**
   * El botón mostró el estado *"Agendando Mantenimiento..."*.
   * La petición HTTP `POST /api/v1/mantenimientos/planificar` fue reenviada con éxito por el Gateway hacia `ms-activos`.
   * El backend registró el mantenimiento en la tabla `mantenimientos` con estado `"Pendiente"`.
   * Se desplegó el Toast verde de confirmación y el usuario fue redirigido a la vista de inventario.

---

## 6. Verificación de Compilación y Calidad de Código

* **Compilación de Producción con Vite:**
  ```bash
  npm run build
  ```
  * Resultado: **120 módulos transformados, 0 errores, compilación finalizada en 1.43s**.
* **Linter (Oxlint):**
  ```bash
  npm run lint
  ```
  * Resultado: **0 errores**.
* **Pruebas de API Gateway:**
  ```bash
  npm test
  ```
  * Resultado: **4/4 tests pasando exitosamente (100%)**, verificando los proxies hacia activos, mantenimientos, incidencias y notificaciones.

---

## 7. Resumen de Smart Commit

* **Código de Tarea:** `TAL-7`
* **Tiempo Imputado:** `2h 30m`
* **Mensaje del Commit:**
  ```text
  TAL-7 #time 2h 30m feat(frontend): formulario web de planificacion de mantenimiento preventivo y navegacion
  ```
* **Archivos Involucrados:**
  1. `frontend-web/src/services/mantenimientosService.js` (Nuevo)
  2. `frontend-web/src/components/PlanificarMantenimientoForm.jsx` (Nuevo)
  3. `frontend-web/src/views/PlanificarMantenimiento.jsx` (Nuevo)
  4. `frontend-web/src/App.jsx` (Modificado)
  5. `frontend-web/src/components/Layout.jsx` (Modificado)
  6. `frontend-web/src/views/Inventario.jsx` (Modificado)
  7. `docs/Sprint-2/semana-2/TAL-7-formulario-planificacion-mantenimiento-preventivo.md` (Nuevo)
