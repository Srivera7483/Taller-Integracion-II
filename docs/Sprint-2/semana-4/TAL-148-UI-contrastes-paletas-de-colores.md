# TAL-148: UI — Contrastes, Paleta de Colores e Identidad Visual Corporativa

## 1. Resumen Ejecutivo y Objetivos del Requerimiento

El objetivo de esta intervención fue maximizar el atractivo estético y consolidar la **identidad visual corporativa institucional de la Universidad Católica de Temuco (UCT)** en toda la plataforma web frontend (`frontend-web`).

### Objetivos Específicos:
1. **Calibración de la Paleta Corporativa:** Configuración estricta en Tailwind CSS de los colores institucionales `primary` (Azul Marino Institucional) y `secondary` (Ámbar / Dorado Cálido) para lograr un realce visual coherente y profesional.
2. **Unificación de Radios de Borde:** Estandarización de bordes en toda la interfaz a únicamente dos escalas armónicas: `rounded-xl` para contenedores/tarjetas/modales y `rounded-lg` para controles/botones/inputs.
3. **Contraste Limpio y Accesibilidad (WCAG 2.1 AA):** Garantizar contraste de color nítido sobre fondos grises (`bg-gray-50`, `bg-slate-50`) y blancos, eliminando textos de bajo contraste y preservando el puntaje de accesibilidad del 100% alcanzado en auditorías Lighthouse.
4. **Resalte de Botones de Acción (Calls to Action - CTAs):** Otorgar prominencia visual inmediata a las acciones principales de cada módulo con sombras profundas, microinteracciones `hover`/`active` y tipografía destacada.

### Cumplimiento de Criterios de Aceptación:
* ✅ **Criterio 1: UI unificada sin mezclas extrañas de colores.** Se erradicaron completamente los tonos dispersos `indigo-` (`#4f46e5`) y degradados morados/púrpuras heredados de plantillas genéricas. Se consolidó una paleta institucional limpia basada en el azul marino `#003366`, el dorado/ámbar `#d97706`, y colores semánticos bien definidos (esmeralda para éxito, rojo para rechazos y alertas críticas).
* ✅ **Criterio 2: Botones de acción principales (Calls to Action) resaltan visualmente.** Todos los botones de acción resolutiva (Login, Reportar Incidencia, Asignar Técnico, Guardar Cierre, Planificar Mantenimiento y Guardar Diagnóstico) cuentan con estilo visual prioritario, alto contraste y elevación.

---

## 2. Configuración del Sistema de Diseño en Tailwind CSS

### 2.1. Calibración en `frontend-web/tailwind.config.js`
Se incorporó la escala cromática institucional completa y se normalizó la escala de bordes redondeados:

```javascript
// frontend-web/tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef6fc',
          100: '#d9ecf8',
          200: '#b8daf2',
          300: '#87c1ea',
          400: '#50a2de',
          500: '#2a85ce',
          600: '#1b69ad',
          700: '#17548c',
          800: '#164774',
          900: '#173c61',
          950: '#0f2741',
          DEFAULT: '#003366', // Azul Marino Institucional UCT
          hover: '#00254d',
          active: '#001936',
        },
        secondary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706', // Ámbar / Dorado Cálido Institucional UCT
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
          DEFAULT: '#d97706',
          hover: '#b45309',
          active: '#92400e',
        },
      },
      borderRadius: {
        sm: '0.5rem',  // Normalizado a rounded-lg
        DEFAULT: '0.5rem',
        md: '0.5rem',  // Normalizado a rounded-lg
        lg: '0.5rem',  // 8px estricto
        xl: '0.75rem', // 12px estricto
        '2xl': '0.75rem', // Normalizado a rounded-xl
        '3xl': '0.75rem', // Normalizado a rounded-xl
      },
    },
  },
};
```

### 2.2. Integración en `frontend-web/src/index.css`
Para compatibilidad nativa con Tailwind CSS v4 y Vite 8, se vincularon las variables CSS corporativas dentro de la directiva `@theme`:

```css
/* frontend-web/src/index.css */
@import "tailwindcss";
@config "../tailwind.config.js";

@theme {
  --color-primary: #003366;
  --color-primary-hover: #00254d;
  --color-primary-active: #001936;
  --color-primary-50: #eef6fc;
  --color-primary-100: #d9ecf8;
  --color-primary-200: #b8daf2;
  --color-primary-300: #87c1ea;
  --color-primary-400: #50a2de;
  --color-primary-500: #2a85ce;
  --color-primary-600: #1b69ad;
  --color-primary-700: #17548c;
  --color-primary-800: #164774;
  --color-primary-900: #173c61;
  --color-primary-950: #0f2741;

  --color-secondary: #d97706;
  --color-secondary-hover: #b45309;
  --color-secondary-active: #92400e;
  --color-secondary-50: #fffbeb;
  --color-secondary-100: #fef3c7;
  --color-secondary-200: #fde68a;
  --color-secondary-300: #fcd34d;
  --color-secondary-400: #fbbf24;
  --color-secondary-500: #f59e0b;
  --color-secondary-600: #d97706;
  --color-secondary-700: #b45309;
  --color-secondary-800: #92400e;
  --color-secondary-900: #78350f;
  --color-secondary-950: #451a03;

  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
}
```

---

## 3. Matriz de Componentes y Vistas Actualizadas

Se intervinieron de forma exhaustiva todos los módulos de `frontend-web/src`, sustituyendo mezclas cromáticas y unificando radios:

| Archivo (Ruta Relativa) | Cambios de Color / Identidad | Radios Unificados | CTA / Botones Optimizados |
| :--- | :--- | :--- | :--- |
| `frontend-web/src/components/Layout.jsx` | Incorporación de badge oficial UCT (`InfraManager UCT Institucional`), navegación activa con `bg-primary-50 text-primary border-primary`. | Estandarizado a `rounded-lg` en ítems de navegación y buscador. | Enlace de salida y botones del drawer móvil. |
| `frontend-web/src/Login.jsx` | Tarjeta institucional con badge UCT y acento en azul marino corporativo. | Contenedor principal normalizado a `rounded-xl`. | Botón `#submit-btn` reforzado con `bg-primary hover:bg-primary-hover shadow-md hover:shadow-lg hover:-translate-y-0.5`. |
| `frontend-web/src/views/Dashboard.jsx` | Reemplazo de tonos índigo y azules saturados por azul marino `primary`. Spinner corporativo. | Tarjetas de métricas y contenedores a `rounded-xl`. | Botones de acceso directo a incidencias y mantenimientos. |
| `frontend-web/src/views/Incidencias.jsx` | Filtro de búsqueda y tags de activos en paleta corporativa. | Tablas, tarjetas móviles y contenedores a `rounded-xl`. | Botón "Reportar Incidencia" como CTA destacado en `primary`. |
| `frontend-web/src/views/AsignarTecnico.jsx` | Erradicación total de `indigo-` en el panel de supervisor. Contexto en `primary-50`. | Contenedor y acordeón a `rounded-xl`, selects a `rounded-lg`. | Botón `#btn-asignar-orden` con color primario institucional y sombra de acción. |
| `frontend-web/src/components/FormularioReporteIncidencia.jsx` | Foco de inputs en `focus:ring-primary/20 focus:border-primary`. | Campos a `rounded-lg`, dropzones a `rounded-xl`. | Botón `#btn-enviar-incidencia` con alta prominencia visual. |
| `frontend-web/src/views/DetalleIncidencia.jsx` | Encabezados limpios, badges de activo verificados en dorado `secondary-50` y `primary-50`. | Tarjeta de detalle a `rounded-xl`, badges y acciones a `rounded-lg`. | Botón "Ver en Alta Resolución" y botón de acción de cierre técnico. |
| `frontend-web/src/views/DetalleOrden.jsx` | Cabecera y datos de contexto en azul marino institucional. | Contenedor a `rounded-xl`, botones a `rounded-lg`. | Botón `#btn-abrir-modal-cierre` optimizado para visibilidad táctil. |
| `frontend-web/src/views/Inventario.jsx` | Filtro de búsqueda y tarjetas de activos adaptadas a la identidad UCT. | Tabla y métricas a `rounded-xl`. | Botón "Añadir Equipo" con diseño CTA principal. |
| `frontend-web/src/views/Mantenimientos.jsx` | Métricas de mantenimiento en paleta `primary`, iconos sin colores extraños. | Contenedor de lista a `rounded-xl`. | Botón "Planificar Mantenimiento" destacado. |
| `frontend-web/src/components/PlanificarMantenimientoForm.jsx` | Encabezado corporativo, icono de calendario en `bg-secondary`. | Contenedores a `rounded-xl`, selectores y fecha a `rounded-lg`. | Botón `#btn-guardar-planificacion` en `bg-primary hover:bg-primary-hover`. |
| `frontend-web/src/views/Trazabilidad.jsx` y `TimelineActivo.jsx` | Nodos de mantenimiento y líneas cronológicas en `primary`. | Contenedor a `rounded-xl`, badges y tags a `rounded-lg`. | Botones de expansión y acordeón relacional de Prisma. |
| `frontend-web/src/views/Usuarios.jsx` | Catálogo de usuarios sin degradados índigo; avatares en `bg-primary text-white`. | Tabla con scroll infinito a `rounded-xl`. | Badges de rol (Admin en `secondary-50`, Técnico en `primary-50`). |
| `frontend-web/src/components/DataTable.jsx` | Header y paginación sincronizados con `primary`. | Contenedor a `rounded-xl`, buscador y paginador a `rounded-lg`. | Botones Anterior / Siguiente en `rounded-lg`. |
| `frontend-web/src/components/ModalCierreMantenimiento.jsx` | Cabecera del modal en azul marino `bg-primary` (y rojo en modo rechazo). | Modal a `rounded-xl`, inputs táctiles a `rounded-lg`. | Botón `#btn-confirmar-cierre-mantenimiento` prominente. |
| `frontend-web/src/components/ModalPrevisualizadorImagen.jsx` | Encabezado oscuro institucional y acentos en `primary`. | Marco del modal a `rounded-xl`. | Botón superpuesto "Eliminar/Cambiar imagen" en `primary`. |
| `frontend-web/src/components/EvidenciaUploader.jsx` | Dropzone y spinner Cloudinary en tonos institucionales `primary`. | Contenedores a `rounded-xl`, botones de acción a `rounded-lg`. | Botón visual mutante "Subir Evidencia" en `bg-primary`. |
| `frontend-web/src/components/ImageUploader.jsx` | Miniatura con borde `primary` y badges normalizados. | Marco a `rounded-xl`, controles a `rounded-lg`. | Botones de inspección y cambio de imagen. |
| `frontend-web/src/components/DiagnosticoTecnico.jsx` | Iconografía y foco adaptados a `primary`. | Panel a `rounded-xl`, textarea a `rounded-lg`. | Botón "Guardar Diagnóstico" en `bg-primary hover:bg-primary-hover`. |
| `frontend-web/src/components/FiltrosRangoFechasMantenimientos.jsx` | Toolbar con atajos rápidos en `primary-50 text-primary border-primary-200`. | Tarjeta a `rounded-xl`, inputs a `rounded-lg`. | Botón "Filtrar" como CTA principal. |
| `frontend-web/src/components/PanelIncidenciaRechazada.jsx` | Tonalidades rojas suaves para advertencia empática sin estridencias. | Contenedor principal a `rounded-xl`. | Enlace "Generar Nuevo Reporte" con contraste reforzado. |
| `frontend-web/src/components/CriticalAlertBanner.jsx` | Degradado de advertencia crítica con cierre accesible. | Botones de acción normalizados a `rounded-lg`. | Botón "Ver listado" en alto contraste. |
| `frontend-web/src/views/NotFound.jsx` y `ServerError.jsx` | Header mínimo con insignia UCT en `bg-primary`. Insignias 404/500 en `secondary`. | Tarjetas a `rounded-xl`, botones a `rounded-lg`. | Botones "Volver al Inicio" y "Reintentar Conexión" en `bg-primary`. |

---

## 4. Reglas de Contraste y Calibración Visual

1. **Jerarquía Tipográfica y Fondos:**
   - Textos principales sobre fondos blancos o grises claros (`bg-white`, `bg-gray-50`, `bg-slate-50`) utilizan `text-gray-900` o `text-gray-800` (ratio de contraste superior a `10:1`).
   - Textos secundarios de apoyo utilizan `text-gray-600` o `text-gray-700` (ratio de contraste superior a `7:1`, superando el mínimo de `4.5:1` de WCAG AA).
   - Se descartaron textos claros (`text-gray-400`) sobre fondos claros.
2. **Badges e Insignias de Estado:**
   - Estructurados mediante la técnica de fondo claro y texto saturado: `bg-primary-50 text-primary border border-primary-200` o `bg-secondary-50 text-secondary-800 border border-secondary-200`.
3. **Botones de Llamada a la Acción (CTAs):**
   - Color de fondo: `bg-primary` (`#003366`) con texto blanco puro `#ffffff` (ratio de contraste `12.5:1`, calificación AAA).
   - Sombra y elevación: `shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0` para proporcionar respuesta táctil y profundidad tridimensional.

---

## 5. Auditoría de Código y Verificación de Compilación

### 5.1. Verificación Automatizada de Clases Residuales
Se ejecutó un script de análisis estático sobre el árbol `frontend-web/src`:
* **Búsqueda de clases `rounded-2xl`, `rounded-3xl`, `rounded-md`:** `0 ocurrencias`.
* **Búsqueda de clases residuales `indigo-`, `purple-`:** `0 ocurrencias`.
* **Consistencia de radios:** Todos los contenedores usan `rounded-xl`, todos los controles interactivos usan `rounded-lg`.

### 5.2. Compilación de Producción con Vite
```powershell
pnpm.cmd --dir frontend-web build
```

**Resultado:**
```text
vite v8.3.0 building client environment for production...
transforming...
✓ 135 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.76 kB │ gzip:   0.42 kB
dist/assets/index-9gKLoVuK.css   92.85 kB │ gzip:  13.96 kB
dist/assets/index-BHciu8Ax.js   640.49 kB │ gzip: 171.67 kB
✓ built in 1.18s
```

La compilación generó los paquetes de distribución de forma limpia en 1.18 segundos, validando la integridad sintáctica de todos los archivos JSX y estilos CSS.

