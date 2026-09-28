# TAL-63: Implementación de Indicadores de Prioridad Web

## 1. Diagnóstico y Objetivo General

- **Objetivo General:** Implementación de indicadores de prioridad web ("Incorporar elementos visuales para reflejar la prioridad de las órdenes en la interfaz").
- **Criterios de Aceptación:**
  1. Las tablas y tarjetas de órdenes evalúan el campo de prioridad (de la entidad `ORDENES_TRABAJO` en el backend) para reflejarlo en la interfaz. La conexión queda estructurada y preparada para cuando el usuario decida enlazar los endpoints en vivo.
  2. Opción interactiva para filtrar por grado de "Prioridad" (`Todas`, `Alta`, `Media`, `Baja`, `Sin Prioridad`).

---

## 2. Resumen de Cambios Técnicos en el Frontend (`frontend-web`)

### 2.1. Nuevo Componente Visual: `PriorityBadge.jsx`
- **Ubicación:** `frontend-web/src/components/PriorityBadge.jsx`
- **Responsabilidad:** Representar visualmente el grado de prioridad de una orden de trabajo de manera consistente y accesible en toda la aplicación.
- **Valores soportados (Esquema Prisma `Prioridad`):**
  - **`Alta`**: Indicador con tono carmesí/rosa (`bg-rose-50 text-rose-700 border-rose-200`), icono de advertencia (`FiAlertTriangle`), y punto animado con efecto `animate-ping` para denotar urgencia operativa.
  - **`Media`**: Indicador ámbar (`bg-amber-50 text-amber-800 border-amber-200`) con icono de reloj/equilibrio (`FiClock`).
  - **`Baja`**: Indicador esmeralda (`bg-emerald-50 text-emerald-700 border-emerald-200`) con icono de descenso/estabilidad (`FiArrowDown`).
  - **`No Asignada` / Fallback**: Indicador neutro en gris para estados previos a la clasificación del Supervisor.
- **Props flexibles:** `priority`, `prioridad`, `size` (`xs`, `sm`, `md`, `lg`), `showIcon`, `showDot`, `variant` (`badge`, `pill`, `subtle`, `outline`), y `className`.

### 2.2. Capa de Servicios: `ordenesService.js`
- **Ubicación:** `frontend-web/src/services/ordenesService.js`
- **Preparación de Conexión Backend:**
  - `getOrdenesTrabajoEndpoint()`: Construye la URL hacia `/api/incidencias/ordenes-trabajo` en el API Gateway.
  - `obtenerOrdenesTrabajoApi({ usarMock })`: Función asíncrona lista para consumir el endpoint `GET /api/incidencias/ordenes-trabajo` cuando el microservicio esté en marcha, con fallback automático al conjunto mockeado.
  - `MOCK_ORDENES_TRABAJO`: Conjunto de datos representativo que refleja con exactitud los atributos de la tabla `OrdenTrabajo` de Prisma (`id_orden`, `incidencia_id`, `tecnico_id`, `estado`, `prioridad`, `instrucciones`, `fecha_asignacion`).
  - `evaluarPrioridadOrden(item)`: Helper de utilidad que extrae de forma resiliente el nivel de prioridad tanto si proviene directamente de `item.prioridad` (entidad `ORDENES_TRABAJO`), de `item.orden_trabajo?.prioridad` o de `item.ordenes_trabajo[0]?.prioridad`.

### 2.3. Vista de Incidencias y Órdenes: `Incidencias.jsx`
- **Ubicación:** `frontend-web/src/views/Incidencias.jsx`
- **Conmutador de Vistas:** Permite alternar entre **Vista Tabla** (tabular compacta) y **Vista Tarjetas** (cards para visualización ágil de órdenes).
- **Filtro Reactivo por Grado de Prioridad:**
  - Botonera de filtrado interactivo con conteos en tiempo real:
    - **Todas** (total de registros)
    - **Alta** (con acento visual y conteo)
    - **Media** (con acento visual y conteo)
    - **Baja** (con acento visual y conteo)
    - **Sin Prioridad** (registros sin clasificar)
  - Filtro combinado: combina la búsqueda por texto (título, activo, ID, técnico) con el filtro por prioridad seleccionado.
- **Evaluación en Tabla y Tarjetas:** Ambas presentaciones consumen `evaluarPrioridadOrden` e insertan `<PriorityBadge priority={...} />`.

### 2.4. Vista de Asignación de Técnico: `AsignarTecnico.jsx`
- **Ubicación:** `frontend-web/src/views/AsignarTecnico.jsx`
- Unificación del banner de confirmación `#banner-orden-emitida` y de las tarjetas del historial `#seccion-ordenes-emitidas` para renderizar el componente oficial `PriorityBadge`.

### 2.5. Panel de Control: `Dashboard.jsx`
- **Ubicación:** `frontend-web/src/views/Dashboard.jsx`
- Tarjetas de resumen que desglosan la cantidad de órdenes según su criticidad (`Alta`, `Media`, `Baja`).
- Columna "Prioridad" agregada a la tabla de órdenes e incidencias recientes con su correspondiente `PriorityBadge`.

---

## 3. Guía de Conexión Futura Frontend-Backend

Cuando el desarrollador desee conectar los datos directamente con el microservicio `ms-incidencias`:

1. Asegurar que el API Gateway (`api gateway/index.js`) y `ms-incidencias` se encuentren en ejecución.
2. En `Incidencias.jsx` o en la vista deseada, reemplazar el estado inicial basado en cookies/mock por:
```javascript
import { obtenerOrdenesTrabajoApi } from '../services/ordenesService';

useEffect(() => {
  async function cargarOrdenes() {
    const { ok, data } = await obtenerOrdenesTrabajoApi({ usarMock: false });
    if (ok) {
      setIncidencias(data);
    }
  }
  cargarOrdenes();
}, []);
```
3. Dado que las tarjetas y tablas ya consumen `evaluarPrioridadOrden(item)` y `PriorityBadge`, responderán automáticamente al campo `prioridad` devuelto por el backend.
