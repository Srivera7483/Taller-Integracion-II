# TAL-5: Componente visual de trazabilidad de activos

## 1. Objetivo y Alcance

Implementar el componente visual de trazabilidad y ciclo de vida de activos en el cliente web (`frontend-web`), junto con el servicio de mocking del endpoint `GET /api/v1/activos/:id/trazabilidad`.

### 1.1. Contexto de la Tarea
El sistema requiere traducir el historial crudo de eventos de un equipo tecnológico en una experiencia visual premium y accesible para el usuario final. Dado que el endpoint backend de trazabilidad se encuentra en fase de desarrollo, se realizó un mocking desacoplado y tipado que simula el resultado del `JOIN` (o `include` en Prisma) entre las incidencias históricas, órdenes de trabajo (reparaciones y mantenimientos), cambios de estado y evidencias registradas.

### 1.2. Criterios de Aceptación
1. **Mocking de API de Trazabilidad**:
   - Simulación del endpoint `GET /api/v1/activos/:id/trazabilidad` funcionando y devolviendo datos paginados o limitados.
   - Consolidación del ciclo de vida completo en un solo paquete de datos ordenado cronológicamente desde el hito más reciente al más antiguo.
   - Alineación estricta al 100% con los esquemas de base de datos de Prisma (`ms-incidencias`, `ms-auth`) y contratos OpenAPI (`docs/openapi.yaml`).
2. **Componente Visual Timeline Vertical**:
   - Maquetación avanzada en React y Tailwind CSS de una línea de tiempo vertical continua.
   - Diseño responsivo que no se desborda en dispositivos móviles (`min-w-0`, `break-words`, márgenes y paddings dinámicos).
   - Diferenciación estricta de colores e iconografía por tipo de evento:
     - **Fallos en rojo**: Averías críticas, incidencias de hardware/red reportadas.
     - **Mantenimientos en azul**: Órdenes de trabajo preventivas y correctivas en ejecución.
     - **Resoluciones en verde**: Cierre de órdenes, certificaciones técnicas y normalización del servicio.
     - **Alta en índigo**: Incorporación inicial del activo e inventario.
3. **Detalles Técnicos y Usabilidad**:
   - Nodos circulares conectados por una línea vertical continua.
   - Acordeón desplegable en cada hito para consultar los atributos de la base de datos (`id_incidencia`, `id_orden`, `prioridad`, `instrucciones`, `diagnostico_tecnico`, `fechas` y `url_evidencia`).
   - Selector interactivo de activos para auditar distintos equipos del campus.
   - Filtrado reactivo de hitos por categoría (Todos, Fallos, Mantenimientos, Resoluciones).

---

## 2. Componentes Implementados

### 2.1. Servicio de Mocking de Trazabilidad (`frontend-web/src/services/trazabilidadService.js`)
- **`obtenerTrazabilidadActivoApi(idActivo, { page, limit, tipoFiltro, usarMock })`**:
  - Intenta consultar la ruta perimetral del API Gateway (`/v1/activos/:id/trazabilidad`).
  - Ante ausencia de conexión con el backend en vivo, aplica fallback automático e instantáneo al dataset simulado.
  - Ordena los eventos de forma cronológica descendente (`ORDER BY fecha DESC`).
  - Soporta paginación devolviendo el bloque estándar: `{ total, pagina, limite, totalPaginas, tieneMas }`.
- **Estructura del Payload Consolidado (JOIN Prisma)**:
  - **`activo`**: Refleja la entidad `Activo` (`id`, `codigoQr`, `nombre`, `categoria`, `modelo`, `numeroSerie`, `ubicacion`, `estadoActual`, `fechaRegistro`).
  - **`trazabilidad`**: Colección de hitos derivados de `INCIDENCIAS`, `ORDENES_TRABAJO`, `HISTORIAL_ESTADOS` y `EVIDENCIAS`.
  - **`resumenEstadistico`**: Conteo consolidado de fallos, mantenimientos, resoluciones y total de hitos.

### 2.2. Componente Visual del Timeline (`frontend-web/src/components/TimelineActivo.jsx`)
- **Diseño Mobile-First**: Nodos alineados a la izquierda con padding relativo (`pl-12 sm:pl-16`) que evitan desbordes horizontales en resoluciones pequeñas.
- **Diferenciación Semántica de Colores**:
  - `fallo`: Aro pulsante (`animate-ping`), fondo `bg-rose-600`, badge `bg-rose-100 text-rose-800` e icono `FiAlertTriangle`.
  - `mantenimiento`: Fondo `bg-blue-600`, badge `bg-blue-100 text-blue-800` e icono `FiTool`.
  - `resolucion`: Fondo `bg-emerald-600`, badge `bg-emerald-100 text-emerald-800` e icono `FiCheckCircle`.
  - `adquisicion`: Fondo `bg-indigo-600`, badge `bg-indigo-100 text-indigo-800` e icono `FiPackage`.
- **Panel Acordeón de Campos del Registro (BD)**: Despliega metadatos técnicos exclusivamente presentes en los esquemas relacionales del proyecto:
  - `id_incidencia` e `id_orden`.
  - Nivel de `prioridad` de la orden de trabajo (`Alta`, `Media`, `Baja`).
  - `estado_orden` (`Pendiente`, `EnProceso`, `Completada`).
  - `instrucciones` del supervisor y `diagnostico_tecnico` del técnico.
  - Marcas de tiempo: `fecha_asignacion`, `fecha_inicio`, `fecha_termino`.
  - Evidencias fotográficas asociadas (`url_cloudinary`).
- **Controles de Paginación**: Navegación integrada entre páginas de eventos cuando el historial supera el límite por página.

### 2.3. Vista de Trazabilidad (`frontend-web/src/views/Trazabilidad.jsx`)
- **Cabecera Operativa**: Título oficial con la descripción:
  > *"Historial consolidado de incidencias históricas, reparaciones realizadas y cambios de estado."*
- **Selector Rápido de Activo**: Permite cambiar dinámicamente entre equipos representativos (`ACT-2026-0001` Proyector, `SRV-BLADE-07` Servidor Blade, `SW-CORE-01` Switch Cisco, `ACT-2026-0002` Computador Docente).
- **Tarjeta de Identidad del Equipo**: Muestra datos oficiales del activo (Código QR, Categoría, Estado operativo con `StatusBadge`, Ubicación y Fecha de Registro).
- **Acción Rápida**: Botón *"Reportar Falla en este Activo"* que redirige al formulario de reporte precargando el ID del equipo.
- **Tarjetas KPI**: Indicadores resumidos con contadores en tiempo real de Hitos Totales, Fallos, Mantenimientos y Resoluciones.
- **Filtros Interactivos**: Botonera para filtrar la línea de tiempo por tipo de evento con conteos dinámicos.

---

## 3. Integración en la Arquitectura Frontend

```text
[ Menú Lateral / Layout ] ──> NavLink "Trazabilidad" (/trazabilidad)
                                     │
[ Inventario de Activos ] ──> Botón "Trazabilidad" (/trazabilidad/:id)
                                     │
[ Dashboard Operativo ]   ──> Clic en ID Activo (/trazabilidad/:id)
                                     │
                                     ▼
                        ┌─────────────────────────┐
                        │    Trazabilidad.jsx     │
                        │  (Selector + Filtros)   │
                        └────────────┬────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    ┌─────────────────────────┐             ┌─────────────────────────┐
    │  trazabilidadService.js │             │   TimelineActivo.jsx    │
    │  Mocking API GET /v1/   │             │  Timeline Vertical      │
    │  activos/:id/trazabilidad             │  Rojo/Azul/Verde/Índigo │
    └─────────────────────────┘             └─────────────────────────┘
```

### Rutas Habilitadas en `frontend-web/src/App.jsx`
- `/trazabilidad`: Vista general con el activo por defecto o query param `?id_activo=...`.
- `/trazabilidad/:idActivo`: Acceso directo por parámetro de ruta.
- `/activos/:idActivo/trazabilidad`: Alias canónico según el diseño REST de la API.
---

## 4. Alineación Estricta con los Modelos de Base de Datos

En estricto apego a los modelos de base de datos definidos en el proyecto, el mocking y la interfaz excluyen cualquier atributo no estandarizado:

| Entidad / Schema | Atributos Utilizados |
|---|---|
| **`Activo`** (`ms-activos`) | `id`, `codigoQr`, `nombre`, `categoria`, `modelo`, `numeroSerie`, `ubicacion`, `estado`, `fechaRegistro` |
| **`Incidencias`** (`ms-incidencias`) | `id_incidencia`, `id_activo`, `id_reportante`, `titulo`, `descripcion`, `fecha_creacion` |
| **`OrdenTrabajo`** (`ms-incidencias`) | `id_orden`, `incidencia_id`, `tecnico_id`, `estado`, `prioridad`, `instrucciones`, `diagnostico_tecnico`, `fecha_asignacion`, `fecha_inicio`, `fecha_termino` |
| **`HistorialEstados`** (`ms-incidencias`) | `id_historial`, `id_incidencia`, `id_estado`, `id_usuario_cambio`, `fecha_creacion` |
| **`Evidencia`** (`ms-incidencias`) | `id_evidencia`, `id_incidencia`, `id_tipo_evidencia`, `url_cloudinary` |

---

## 5. Verificación y Pruebas de Calidad

1. **Linter Oficial (`oxlint`)**:
   - Ejecutado sobre los 35 archivos del frontend: **`0 errores`**.
2. **Compilación de Producción (`vite build`)**:
   - Construcción del paquete de distribución final aprobada con éxito (`✓ built in 697ms`).
3. **Pruebas en Navegador**:
   - Verificación de la línea conectora vertical y la correcta visualización en pantallas móviles y desktop sin desbordamiento horizontal.
   - Comprobación de la diferenciación cromática (rojo para fallos, azul para mantenimientos, verde para resoluciones, índigo para altas).
   - Validación del acordeón desplegable y el cambio dinámico de activo mediante el selector.
