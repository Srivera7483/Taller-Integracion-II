# TAL-121: Filtros Dinámicos de Rango de Fechas para Mantenimientos

## 1. Información de la Tarea de Jira
* **Código:** TAL-121
* **Título:** Filtros dinámicos de rango de fechas para mantenimientos
* **Responsable:** Benjamín Soto (Miembro 4 - Fullstack)
* **Sprint:** Sprint 2 (2 oct – 28 oct)
* **Tiempo Total Estimado / Imputado:** 2h (`#time 2h`)
* **Dependencias:** TAL-7 (Formulario web de planificación de mantenimiento preventivo)
* **Ubicación de Documentación:** `docs/Sprint-2/semana-2/TAL-121-filtros-rango-fechas-mantenimientos.md`
* **Rama de Trabajo:** `feature/TAL-121-filtros-rango-fechas-mantenimientos`

---

## 2. Objetivo General y Contexto
El objetivo principal de esta tarea es brindar a los técnicos de soporte y administradores de infraestructura la capacidad de consultar, supervisar y filtrar cómodamente la agenda de mantenimientos preventivos y correctivos mediante una barra superior de herramientas (*toolbar*).

La solución permite especificar un rango de fechas con dos selectores (`Fecha Inicio` y `Fecha Fin`), sincronizando automáticamente los filtros con la *Query String* de la URL (ej. `?startDate=2026-10-01&endDate=2026-10-31`) y refrescando la tabla para mostrar con precisión únicamente las intervenciones agendadas en dicho periodo.

Se enlaza de forma directa con la tarea **TAL-7**, permitiendo navegar fluidamente entre el listado general de mantenimientos programados y la creación de nuevas órdenes de trabajo preventivo.

---

## 3. Criterios de Aceptación y Cumplimiento Técnico

| Criterio de Aceptación | Estado | Implementación y Mecanismo Técnico |
| :--- | :---: | :--- |
| **1. Restauración al limpiar fechas** | ✅ Cumplido | Al pulsar el botón "Limpiar" o el botón de acción en el estado vacío, se eliminan los parámetros `startDate` y `endDate` de la *Query String*, se restablecen los selectores a vacío y la tabla recarga automáticamente el listado completo original de mantenimientos. |
| **2. Formatos de fecha ISO y YYYY-MM-DD** | ✅ Cumplido | Los inputs nativos HTML5 operan en formato `YYYY-MM-DD`. El servicio cliente y el controlador backend aceptan tanto formato estándar `YYYY-MM-DD` como ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`), normalizando los extremos a `00:00:00.000` y `23:59:59.999` para incluir la jornada completa. |
| **3. Barra superior de herramientas (Toolbar)** | ✅ Cumplido | Componente `FiltrosRangoFechasMantenimientos.jsx` ubicado sobre la tabla con selector de `Fecha Inicio`, selector de `Fecha Fin`, botón "Filtrar" y botón "Limpiar", con diseño adaptativo y atajos rápidos. |
| **4. Modificación de la Query String y refresco** | ✅ Cumplido | Utilización del hook `useSearchParams` de React Router para reflejar de forma reactiva `?startDate=...&endDate=...` en la barra de direcciones del navegador. Al presionar "Filtrar", la URL cambia y se gatilla la recarga de datos mediante `fetchMantenimientos`. |
| **5. Coherencia y validación temporal** | ✅ Cumplido | Validación reactiva que impide filtrar si `Fecha Inicio` es posterior a `Fecha Fin`, mostrando una advertencia visual tanto en cliente como protección de excepción HTTP 400 (`BadRequestException`) en el microservicio. |

---

## 4. Arquitectura y Componentes Desarrollados

### 4.1. Backend (`ms-activos`): Endpoint y Lógica de Filtrado

#### 4.1.1. Controlador: `mantenimientos.controller.ts`
Se incorporó el decorador `@Get()` al controlador de mantenimientos para responder a las consultas con *Query Parameters*:
* **Ruta:** `GET /api/v1/mantenimientos`
* **Query Parameters soportados:**
  * `startDate`: Fecha de corte inicial (`YYYY-MM-DD` o ISO).
  * `endDate`: Fecha de corte final (`YYYY-MM-DD` o ISO).
  * `id_activo`: Identificador opcional del activo para filtrado específico.

#### 4.1.2. Servicio: `activos.service.ts`
Se implementó el método `listarMantenimientos(filtros)`:
* **Persistencia Prisma:** Si la base de datos está disponible, ejecuta `prisma.mantenimiento.findMany` con filtro `fecha_programada: { gte, lte }`, incluyendo los datos relacionados del activo (`nombre`, `codigoQr`, `ubicacion`, etc.) ordenados cronológicamente por `fecha_programada: 'asc'`.
* **Cálculo de extremos:** Si se envía una fecha `YYYY-MM-DD` como inicio, se fija la hora a las `00:00:00.000 UTC`. Si se envía como fin, se extiende hasta las `23:59:59.999 UTC`.
* **Resiliencia y Fallback:** En caso de que la base de datos PostgreSQL no esté disponible en entornos locales o de pruebas, el servicio aplica el filtrado de forma transparente sobre una colección de mantenimientos en memoria (`mantenimientosEnMemoria`).

#### 4.1.3. Pruebas Unitarias de Backend
Se agregaron 7 pruebas unitarias específicas para TAL-121 en `ms-activos/src/activos.service.spec.ts`:
* Retorno del listado completo sin filtros.
* Filtrado estricto dentro de un rango en formato `YYYY-MM-DD`.
* Filtrado en formato ISO 8601 con marcas de tiempo completas.
* Retorno de colección vacía ante rangos sin coincidencias.
* Rechazo y lanzamiento de `BadRequestException` cuando `startDate > endDate`.
* Validación de formatos de fecha inválidos.
* Comprobación del **Criterio de Aceptación 1**: restauración del listado completo tras limpiar las fechas.

---

### 4.2. Frontend Web (`frontend-web`)

#### 4.2.1. Servicio Cliente: `mantenimientosService.js`
* Se agregó la función `fetchMantenimientos(filtros)` que realiza la llamada `GET /mantenimientos` inyectando los parámetros `params: { startDate, endDate, id_activo }`.
* Incluye un catálogo simulado `MANTENIMIENTOS_FALLBACK` con filtrado en memoria para asegurar que la interfaz continúe operando si el servidor se encuentra temporalmente offline.

#### 4.2.2. Componente Toolbar: `FiltrosRangoFechasMantenimientos.jsx`
* **Ubicación:** `frontend-web/src/components/FiltrosRangoFechasMantenimientos.jsx`
* **Elementos visuales:**
  * Inputs tipo `date` para inicio y fin con iconos ilustrativos (`FiCalendar`).
  * Botón principal **"Filtrar"** con estado de carga ("Filtrando...").
  * Botón **"Limpiar"** con icono `FiRotateCcw`.
  * **Atajos rápidos de rango:** Botones de un clic para "Hoy", "Esta semana", "Este mes" y "Próximos 30 días".
  * **Badge de estado activo:** Muestra el rango actualmente aplicado con conteo de coincidencias y un botón de cruz (`×`) para descartar el filtro instantáneamente.
  * Sincronización bidireccional con `useSearchParams` de React Router.

#### 4.2.3. Vista de Agenda: `Mantenimientos.jsx`
* **Ubicación:** `frontend-web/src/views/Mantenimientos.jsx`
* **Características:**
  * **Tarjetas métricas superiores:** Resumen numérico en tiempo real de mantenimientos en el rango, pendientes, en proceso y completados.
  * **Acciones rápidas:** Botón para refrescar la agenda y botón primario "+ Planificar Mantenimiento" que navega a `/mantenimientos/planificar` (TAL-7).
  * **Buscador de texto rápido:** Filtro complementario por texto sobre el activo o código QR.
  * **Tabla responsiva:** Columnas para Activo (con código QR y ubicación), Fecha Programada formateada en español, Tipo de trabajo, Badge de estado de intervención y enlace a la ficha de Trazabilidad del activo.
  * **Manejo de estado vacío:** Mensaje ilustrativo cuando no hay coincidencias en el rango y botón de llamada a la acción para "Limpiar filtro de fechas (Ver todos)".

#### 4.2.4. Enrutamiento y Navegación
* **`App.jsx`:** Registro de la ruta protegida `<Route path="mantenimientos" element={<Mantenimientos />} />`.
* **`Layout.jsx`:** Inclusión de la opción "Mantenimientos" con icono `FiCalendar` en el menú lateral principal y actualización del título en la cabecera superior.

---

## 5. Verificación y Resultados de Pruebas

### 5.1. Microservicio de Activos (`ms-activos`)
Ejecución del comando `npm test`:
```bash
PASS src/activos.controller.spec.ts
PASS src/activos.service.spec.ts

Test Suites: 2 passed, 2 total
Tests:       25 passed, 25 total
Snapshots:   0 total
Time:        2.99 s
```
*Total de pruebas del microservicio: 25/25 aprobadas (100% de éxito).*

### 5.2. API Gateway (`api gateway`)
Ejecución del comando `npm test`:
```bash
✔ GET / responde 200 OK (251.9ms)
✔ redirige activos e incidencias a sus microservicios (53.8ms)
✔ redirige POST de notificaciones al endpoint interno /notificar (27.4ms)
✔ los proxies devuelven 502 y el Gateway sigue disponible (17.9ms)
tests 4 | pass 4 | fail 0
```
*Todas las rutas proxy operando correctamente.*

### 5.3. Frontend Web (`frontend-web`)
Ejecución de validación de sintaxis y empaquetado:
```bash
> vite build
✓ 123 modules transformed.
dist/index.html                   0.76 kB │ gzip:   0.42 kB
dist/assets/index-GnttTEX6.css   73.08 kB │ gzip:  11.88 kB
dist/assets/index-8aWIOw8R.js   547.91 kB │ gzip: 152.24 kB
✓ built in 1.50s
```
*Compilación y análisis estático finalizados con 0 errores.*

---

## 6. Registro de Tiempos y Smart Commit
* **Tiempo Total Dedicado:** 2 horas (`#time 2h`).
* **Mensaje de Commit Formateado:**
  `TAL-121 #time 2h feat(frontend): filtros dinamicos de rango de fechas para mantenimientos y listado de agenda`
