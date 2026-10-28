# TAL-123: Rediseño Formulario Planificar Mantenimiento

## 1. Información de la Tarea de Jira
* **Código:** TAL-123
* **Título:** Rediseño Formulario Planificar Mantenimiento
* **Componente Base:** TAL-7 (Formulario funcional del M4)
* **Sprint:** Sprint 3 (Semana 2 del Sprint)
* **Rama de Trabajo:** `tal/123`
* **Ubicación de Documentación:** `docs/Sprint-3/semana-2/TAL-123-rediseno-formulario-planificar-mantenimiento.md`

---

## 2. Objetivo General y Contexto

### Objetivo
Convertir el formulario funcional de planificación de mantenimiento preventivo (TAL-7, desarrollado por el M4) en una obra de arte visualmente premium, ergonómica y 100% responsiva, elevando los estándares de diseño corporativo de la plataforma web.

### Descripción
Tomar el componente base `PlanificarMantenimientoForm.jsx` y su vista contenedora `PlanificarMantenimiento.jsx`, aplicando principios avanzados de Tailwind CSS:
* **Sombreados:** Elevación visual con sombras suaves y profundas (`shadow-lg`, `hover:shadow-xl`).
* **Bordes redondeados:** Acabado moderno con esquinas consistentes (`rounded-xl`).
* **Inputs interactivos:** Anillos de enfoque de alta visibilidad (`focus:ring-2 focus:ring-blue-500 focus:border-blue-500`).
* **Tipografía corporativa:** Jerarquía visual con pesos tipográficos claros, mayúsculas con espaciado (`tracking-wider`), microcopy explicativo y fuentes monoespaciadas para identificadores y series.
* **Alineación perfecta de selectores:** Iconos prefijo a la izquierda (`pl-11`), chevrons personalizados a la derecha (`pr-10`) y alturas perfectamente homologadas.
* **Transiciones fluidas en acciones:** Micro-interacciones suaves en el botón de guardar (`hover:scale-105 transition-all duration-200 active:scale-95`).

---

## 3. Criterios de Aceptación y Cumplimiento Técnico

| Criterio de Aceptación | Estado | Implementación y Mecanismo Técnico |
| :--- | :---: | :--- |
| **a. Estética premium digna de un sistema corporativo moderno (no MVP genérico)** | ✅ Cumplido | • Tarjetas modulares con sombra elevada (`shadow-lg`), esquinas redondeadas (`rounded-xl`) y bordes suaves (`border-slate-200/90`).<br>• Badges numerados con degradados (`bg-gradient-to-br from-blue-500 to-indigo-600`) para guiar el flujo paso a paso.<br>• Ficha técnica interactiva del activo con métricas clave (Categoría, Ubicación, N° Serie) e indicador en vivo *"Disponible para intervención"*, además de botón para cambiar activo rápidamente.<br>• Plantillas de tareas frecuentes tipo chips clicables (`+ Limpieza interna...`, `+ Calibración...`) para enriquecer la descripción técnica.<br>• Previsualización ejecutiva en tiempo real ("Resumen de la Planificación") con panel oscuro corporativo, fecha en formato extendido legible y badge de tiempo relativo (*"En 3 días"*). |
| **b. Perfecta visualización en vista móvil (stacking de columnas de inputs)** | ✅ Cumplido | • El selector temporal y la clasificación de servicio se adaptan automáticamente de 2 columnas en desktop (`md:grid-cols-2`) a una sola columna vertical apilada en móvil (`grid-cols-1 gap-5`).<br>• La barra de acciones inferior se reordena ergonómicamente en móvil (`flex flex-col-reverse sm:flex-row`), posicionando el botón principal de guardar al alcance natural del pulgar.<br>• Ficha técnica del activo con apilamiento responsivo (`grid-cols-1 sm:grid-cols-3`).<br>• Dimensiones táctiles generosas (`min-h-[46px]`, `py-3`) y `w-full` en inputs para prevenir desbordes y zoom involuntario en dispositivos móviles. |

---

## 4. Arquitectura y Cambios Realizados

### 4.1. Componente: `frontend-web/src/components/PlanificarMantenimientoForm.jsx`
* **Contenedores de Sección:**
  * Sustitución de `shadow-sm border-gray-200 rounded-2xl` por `shadow-lg border-slate-200/90 rounded-xl hover:shadow-xl transition-shadow`.
  * Cabeceras con iconos en contenedores con gradientes (`from-blue-500 to-indigo-600`, `from-indigo-500 to-purple-600`, `from-emerald-500 to-teal-600`).
* **Inputs y Selectores:**
  * Homologación de estilos: `w-full pl-11 pr-10 py-3 bg-slate-50/70 border border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 outline-none`.
  * Inclusión estricta de `focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-slate-900`.
  * Eliminación de estilos nativos de selects mediante `appearance-none` e incorporación de `FiChevronDown` en posición absoluta derecha (`right-3.5`).
* **Ficha Técnica del Activo:**
  * Panel dinámico con degradado sutil (`from-blue-50/80 via-indigo-50/40 to-slate-50`) con badges específicos de Categoría, Ubicación y N° Serie con iconos `FiLayers`, `FiMapPin` y `FiHash`.
* **Sugerencias Rápidas de Tareas:**
  * Chips interactivos para insertar con un clic tareas frecuentes de mantenimiento sin sobreescribir el texto previo.
* **Tarjeta de Resumen Ejecutivo en Tiempo Real:**
  * Previsualización flotante tipo dashboard (`from-slate-900 via-slate-800 to-indigo-950 text-white`) con cálculo dinámico de fecha legible (`Intl.DateTimeFormat`) y tiempo restante relativo.
* **Botón de Guardar:**
  * Implementación exacta de `hover:scale-105 transition-all duration-200 active:scale-95 shadow-lg shadow-blue-600/30 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white font-semibold rounded-xl px-7 py-3`.

### 4.2. Vista Contenedora: `frontend-web/src/views/PlanificarMantenimiento.jsx`
* Breadcrumb navegable enriquecido con `FiChevronRight`.
* Título de página con icono en badge tridimensional (`bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-600/20`).
* Banner institucional de procedimiento con diseño glassmorphic y tipografía optimizada.

---

## 5. Verificación de Compilación y Calidad

### 5.1. Compilación de Producción (Vite)
```bash
cmd.exe /c "npm run build"
```
* **Resultado:** Compilación exitosa en 851ms, 124 módulos transformados, 0 errores.

### 5.2. Análisis Estático (Oxlint)
```bash
cmd.exe /c "npm run lint"
```
* **Resultado:** `PlanificarMantenimientoForm.jsx` y `PlanificarMantenimiento.jsx` finalizaron con **0 errores y 0 advertencias**.
