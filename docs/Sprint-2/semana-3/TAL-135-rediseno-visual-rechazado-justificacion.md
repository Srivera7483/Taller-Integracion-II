# TAL-135: Rediseño Visual de Incidencia Rechazada y Captura de Justificación Técnica

## 1. Información de la Tarea de Jira
* **Código:** TAL-135
* **Título:** Rediseño Visual de Incidencia Rechazada y Captura de Justificación Técnica
* **Responsable:** Equipo Fullstack / Frontend & Microservicios
* **Sprint:** Sprint 2 (Semana 3 del Sprint)
* **Tiempo Total Estimado:** 2h 00m
* **Tiempo Total Imputado Sincero:** 2h 00m (`#time 2h`)
* **Dependencias:** TAL-40 / TAL-61 / TAL-8 (Definición de Estados de Incidencia y Confirmación de Mantenimiento)
* **Ubicación de Documentación:** `docs/Sprint-2/semana-3/TAL-135-rediseno-visual-rechazado-justificacion.md`
* **Rama de Trabajo:** `feature/TAL-135-rediseno-visual-rechazado-justificacion`

---

## 2. Objetivo General y Contexto
Permitir que el personal técnico asignado a una orden de mantenimiento pueda no solo confirmar intervenciones concluidas, sino también desestimar o rechazar incidencias que no correspondan a fallas reales (por ejemplo: cables desconectados, falta de suministro eléctrico externo, equipos ajenos al inventario, desconfiguraciones del usuario o reportes duplicados). 

Cuando un técnico rechaza una incidencia, el sistema captura obligatoriamente su justificación técnica y transiciona el incidente al estado `"RECHAZADO"` (`"Rechazado"` en la UI). Al acceder al detalle del reporte mediante su identificador único (ej. `INC-1042`), el usuario reportante dispone de un componente visual condicional altamente empático, estético y destacado con tonalidades rojas suaves y advertencia (`bg-red-50 text-red-800 border border-red-200`), exponiendo de forma nítida el motivo del rechazo y las alternativas de acción.

---

## 3. Criterios de Aceptación y Cumplimiento Técnico

| Criterio de Aceptación Jira | Estado | Implementación y Mecanismo Técnico |
| :--- | :---: | :--- |
| **1. Opción de Rechazo en el Formulario "Finalizar Tarea"** | ✅ Cumplido | En `frontend-web/src/components/ModalCierreMantenimiento.jsx`, se integró un selector ergonómico de modo (`Completar Mantenimiento` vs `Rechazar Incidencia`). Al elegir rechazo, se ocultan los campos de horas/materiales y se despliega la zona con un `<textarea>` obligatorio (mínimo 5 caracteres) y chips táctiles de motivos frecuentes para tablets o móviles. |
| **2. Persistencia y Reflejo del Estado "Rechazado" ("RECHAZADO" en código)** | ✅ Cumplido | El servicio `frontend-web/src/services/incidenciasStorage.js` expone `rechazarIncidenciaTecnico()`, almacenando `estado: 'RECHAZADO'`, `motivoRechazo`, `fechaRechazo` y `rechazadoPor`. El microservicio `ms-incidencias` soporta la transición al estado 5 (`Rechazada` / `RECHAZADO`) para el rol `TECNICO` y persiste el motivo en `ORDENES_TRABAJO.diagnostico_tecnico`. |
| **3. Acceso por ID y Visualización en Lista de Incidencias** | ✅ Cumplido | En `frontend-web/src/views/Incidencias.jsx`, el número de ID (ej. `INC-1042`) enlaza directamente a `frontend-web/src/views/DetalleIncidencia.jsx`. Las incidencias rechazadas muestran la insignia roja suave con `StatusBadge.jsx`, reemplazan el botón de "Finalizar Tarea" por "Ver Rechazo" y se integran en los filtros por estado (`StatusFilter`). |
| **4. Componente Condicional en Detalle de Incidencia (`estado === 'RECHAZADO'`)** | ✅ Cumplido | Componente modular `frontend-web/src/components/PanelIncidenciaRechazada.jsx` renderizado condicionalmente en `DetalleIncidencia.jsx`. Utiliza tonalidades rojas suaves y advertencia (`bg-red-50 text-red-800 border border-red-200`) con un bloque prominente y visible para el motivo del rechazo. |
| **5. Diseño Estético, Empático e Iconografía Oficial** | ✅ Cumplido | Emplea iconografía representativa de Heroicons y Lucide (`HiExclamationTriangle`, `LuTriangleAlert`, `LuCircleAlert`, `LuInfo`), orientación empática sobre el significado de la desestimación y botón directo para generar un nuevo reporte si el problema persiste. |

---

## 4. Arquitectura y Componentes Desarrollados

### 4.1. Componente Visual Condicional: `PanelIncidenciaRechazada.jsx`
* **Ruta relativa:** `frontend-web/src/components/PanelIncidenciaRechazada.jsx`
* **Condición de renderizado:** Se evalúa de manera estricta `incidencia.estado === 'RECHAZADO'` en `DetalleIncidencia.jsx`.
* **Diseño y Estilo:**
  * Contenedor con clases Tailwind requeridas: `bg-red-50 text-red-800 border border-red-200 rounded-2xl p-5 sm:p-7 space-y-5 shadow-sm`.
  * Cabecera con ícono de advertencia de Heroicons (`HiExclamationTriangle`) sobre contenedor circular suave (`bg-red-100 border border-red-300`) y badge formal `RECHAZADO` con `LuTriangleAlert`.
  * Bloque grande y visible para el motivo de rechazo:
    ```jsx
    <div className="bg-white/95 border-2 border-red-200 rounded-xl p-4 sm:p-5 shadow-xs">
      <p className="text-base sm:text-lg font-medium text-red-950 leading-relaxed whitespace-pre-wrap">
        {motivoRechazo}
      </p>
    </div>
    ```
  * Bloque empático de ayuda al usuario con `LuInfo` que clarifica que el activo no presenta fallas físicas o que se debió a causas operacionales, proveyendo un enlace rápido hacia `frontend-web/src/views/ReporteIncidencia.jsx` para generar un nuevo reporte si la situación persiste.

### 4.2. Modal de Confirmación y Rechazo: `ModalCierreMantenimiento.jsx`
* **Ruta relativa:** `frontend-web/src/components/ModalCierreMantenimiento.jsx`
* **Control de modo:** Estado reactivo `modoAccion` (`'COMPLETAR'` | `'RECHAZAR'`).
* **Zona de Rechazo Técnica:**
  * `<textarea id="input-motivo-rechazo">` con contador en tiempo real de caracteres.
  * Chips táctiles de motivos recurrentes:
    * *"No es falla, equipo desconectado de la energía eléctrica."*
    * *"No se reproduce la falla reportada durante las pruebas técnicas."*
    * *"Configuración incorrecta u error operacional del usuario."*
    * *"Equipo o software no corporativo fuera del alcance de soporte."*
    * *"Incidencia duplicada o resuelta previamente por otro ticket."*
  * Botón de acción `#btn-confirmar-rechazo-incidencia` con estilos rojos suaves (`bg-red-600 hover:bg-red-700 active:scale-98`) y protección contra doble submit (`isSubmitting`).

### 4.3. Catálogo de Incidencias: `Incidencias.jsx`
* **Ruta relativa:** `frontend-web/src/views/Incidencias.jsx`
* **Mejoras:**
  * Enlace accesible en el número de ID (ej. `INC-1042`) apuntando a `/incidencias/:idIncidencia` tanto en la tabla de escritorio como en las tarjetas móviles.
  * Acción técnica condicional: si el estado es `'RECHAZADO'`, se despliega el botón *"Ver Rechazo"* en tonalidades rojas (`bg-red-50 text-red-700 border border-red-200`) redirigiendo a la vista detallada.
  * Filtro por pestañas (`StatusFilter`) actualizado con la opción *"Rechazado"*, sincronizando contadores en tiempo real.

### 4.4. Componente de Insignias de Estado: `StatusBadge.jsx`
* **Ruta relativa:** `frontend-web/src/components/StatusBadge.jsx`
* **Soporte de estados:** Mapea `'RECHAZADO'`, `'rechazado'` y `'rechazada'` a la clase Tailwind `bg-red-100 text-red-800 border border-red-200`, formateando visualmente el texto como *"Rechazado"*.

### 4.5. Capa de Persistencia Local y Cookies: `incidenciasStorage.js`
* **Ruta relativa:** `frontend-web/src/services/incidenciasStorage.js`
* **Nueva función:** `rechazarIncidenciaTecnico({ incidenciaId, ordenId, motivoRechazo, tecnicoNombre, tecnicoId })`.
  * Establece `estado: 'RECHAZADO'`.
  * Almacena `motivoRechazo`, `fechaRechazo`, `rechazadoPor`.
  * Persiste de forma atómica en las cookies seguras (`temp_incidencias`) con fallback en memoria para entornos de servidor o pruebas automatizadas.

### 4.6. Adaptación del Microservicio `ms-incidencias`
* **Rutas relativas:**
  * `ms-incidencias/src/incidencias/dto/actualizar-estado.dto.ts`: Incorpora el campo opcional `motivo_rechazo?: string`.
  * `ms-incidencias/src/incidencias/incidencias.controller.ts`: Propaga `body.motivo_rechazo` en `PATCH /incidencias/:id_incidencia/estado`.
  * `ms-incidencias/src/incidencias/incidencias.service.ts`:
    * Habilita a los usuarios con rol `TECNICO` a transicionar de estado 2 (`Asignada`) a estado 5 (`Rechazada`).
    * Almacena el motivo de rechazo en `ORDENES_TRABAJO.diagnostico_tecnico`.
    * Retorna `motivo_rechazo` en la entidad pública de la incidencia (`toApiIncidencia`).

---

## 5. Pruebas y Control de Calidad

1. **Pruebas Unitarias del Backend (`ms-incidencias`):**
   * Ejecución con Jest (`npm.cmd test --prefix ms-incidencias`): **11 suites aprobadas de 11 (76 tests exitosos al 100%)**.
2. **Compilación de Producción del Backend (`ms-incidencias`):**
   * Ejecución de `nest build`: Compilación TypeScript limpia sin errores de tipos.
3. **Análisis Estático Frontend (`frontend-web`):**
   * Ejecución de `oxlint` (`npm.cmd run lint --prefix frontend-web`): **0 errores**.
4. **Compilación de Producción Frontend (`frontend-web`):**
   * Ejecución de `vite build`: Empaquetado exitoso de los 132 módulos en 737ms.
5. **Pruebas del Flujo de Rechazo en Storage:**
   * Script automatizado en Node verificó la mutación del objeto a `estado === 'RECHAZADO'` y la recuperación íntegra de `motivoRechazo`.

---

## 6. Desglose Sincero de Tiempos de Ingeniería (`#time 2h`)

| Fase de Desarrollo | Duración | Detalle de Actividades |
| :--- | :---: | :--- |
| **Diseño y Maquetación de `PanelIncidenciaRechazada.jsx`** | 30m | Estructuración del componente con tonalidades `bg-red-50 text-red-800 border border-red-200`, integración de Heroicons/Lucide y bloque destacado para el motivo. |
| **Refactor de `ModalCierreMantenimiento.jsx`** | 35m | Integración del selector táctil "Completar" vs "Rechazar", zona del `<textarea>` de justificación, validaciones mínimas y chips de motivos rápidos. |
| **Integración en Vistas `Incidencias.jsx` y `DetalleIncidencia.jsx`** | 25m | Enlace por ID (`/incidencias/:idIncidencia`), renderizado condicional si `estado === 'RECHAZADO'`, botón "Ver Rechazo" y filtro de estado. |
| **Alineación de Backend `ms-incidencias` y DTOs** | 15m | Actualización de `ActualizarEstadoDto`, permisos de rol técnico para estado 5 y persistencia del motivo en la orden de trabajo. |
| **Pruebas Automatizadas y Documentación** | 15m | Ejecución de Jest (76 tests), Vite build, linter y redacción de documentación técnica en Markdown. |

