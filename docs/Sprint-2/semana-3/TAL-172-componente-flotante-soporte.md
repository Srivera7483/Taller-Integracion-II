# TAL-172: Componente Flotante de Soporte (Floating Action Button) y Formulario Simplificado Móvil

## 1. Información de la Tarea de Jira
* **Código:** TAL-172
* **Título:** Maximizar la accesibilidad de la creación de reportes en dispositivos móviles mediante Floating Action Button (FAB) y Modal simplificado
* **Sprint:** Sprint 2 (Semana 3)
* **Tiempo Total Estimado:** 2h 00m
* **Tiempo Total Imputado Sincero:** 2h 00m (`#time 2h`)
* **Ubicación del Documento:** `docs/Sprint-2/semana-3/TAL-172-componente-flotante-soporte.md`
* **Archivos Involucrados (Rutas Relativas):**
  * `frontend-web/src/components/FabNuevaIncidencia.jsx` *(Nuevo)*
  * `frontend-web/src/components/ModalNuevaIncidenciaMobile.jsx` *(Nuevo)*
  * `frontend-web/src/components/Layout.jsx` *(Modificado)*
  * `frontend-web/src/views/Incidencias.jsx` *(Modificado)*
  * `frontend-web/src/components/FormularioReporteIncidencia.jsx` *(Modificado / Corrección)*

---

## 2. Objetivo General y Contexto

En el uso operativo cotidiano sobre terreno o estaciones de trabajo remotas, los usuarios y técnicos que acceden a la aplicación desde dispositivos móviles tienen como necesidad prioritaria **reportar anomalías de forma inmediata**. Anteriormente, para crear una incidencia en móviles, el usuario debía abrir el menú hamburguesa lateral, navegar al catálogo de incidencias y ubicar el botón superior de "Reportar Incidencia".

El objetivo de esta intervención es **maximizar la accesibilidad** situando un **Floating Action Button (FAB)** circular estilo *Material Design* fijo en la esquina inferior derecha del layout general de la plataforma web en móviles (`lg:hidden`). Al pulsarlo, despliega un modal con un **formulario simplificado de "Nueva Incidencia" adaptado para celulares**, permitiendo registrar reportes con mínima fricción táctil o redirigir a la vista de creación completa.

---

## 3. Criterios de Aceptación y Cumplimiento Técnico

| Criterio de Aceptación Jira | Estado | Mecanismo de Cumplimiento Técnico |
| :--- | :---: | :--- |
| **1. El FAB no interfiere con el scroll natural del usuario** | ✅ Cumplido | • El contenedor del FAB tiene `pointer-events-none` y únicamente el círculo del botón activa `pointer-events-auto`, permitiendo que los gestos táctiles de scroll fuera del botón pasen directo al contenido.<br>• Se incorporó un margen inferior de seguridad (`pb-24 lg:pb-6`) en el contenedor `<main>` de `frontend-web/src/components/Layout.jsx`, permitiendo que el usuario pueda scrollear hasta el fondo de cualquier listado sin que el FAB cubra datos o botones finales.<br>• En `frontend-web/src/views/Incidencias.jsx`, el botón flotante de Excel preexistente se configuró como `hidden lg:flex` para evitar solapamientos y colisiones táctiles en móviles. |
| **2. Dispone de un ícono claro (Ej: un "Más" + o una llave inglesa)** | ✅ Cumplido | Se implementó el ícono de suma `FiPlus` de `react-icons/fi` con trazo grueso (`stroke-[2.5]`) y tamaño destacado de 28px (`w-7 h-7`), en alto contraste blanco sobre el azul marino corporativo UCT (`#003366`), respetando las pautas de Material Design y accesibilidad (`aria-label="Crear nueva incidencia"`). |
| **3. Apertura rápida de formulario simplificado (Modal) o redirección** | ✅ Cumplido | Al presionar el FAB, se abre de forma reactiva el modal `ModalNuevaIncidenciaMobile.jsx` estilo *bottom-sheet*, optimizado para el uso con una sola mano. Incluye adicionalmente un botón directo en la cabecera hacia la vista completa (`/incidencias/nueva`). |

---

## 4. Arquitectura y Componentes Desarrollados

### 4.1. Componente Floating Action Button: `FabNuevaIncidencia.jsx`
* **Ubicación:** `frontend-web/src/components/FabNuevaIncidencia.jsx`
* **Estilo Material Design:**
  * Diámetro estándar de 56x56 px (`w-14 h-14 rounded-full`).
  * Elevación cromática y sombra profunda (`shadow-lg shadow-primary/35 hover:shadow-xl active:shadow-md`).
  * Microinteracciones táctiles suaves (`active:scale-95 transition-all duration-200`).
* **Lógica de Visibilidad:**
  * Se muestra únicamente en vistas móviles (`lg:hidden`).
  * Evalúa `location.pathname`: si el usuario ya se encuentra en `/incidencias/nueva` o `/incidencias/reportar`, el botón se desmonta automáticamente para evitar duplicidad de controles en pantalla.

### 4.2. Formulario Simplificado para Celulares: `ModalNuevaIncidenciaMobile.jsx`
* **Ubicación:** `frontend-web/src/components/ModalNuevaIncidenciaMobile.jsx`
* **Diseño Bottom-Sheet Nativo:**
  * Fondo atenuado con desenfoque (`bg-gray-900/60 backdrop-blur-xs`).
  * Deslizamiento suave desde la parte inferior con manilla táctil de arrastre para dispositivos móviles.
  * Cierre por tecla `Escape`, toque en el fondo exterior o botón `FiX`.
* **Ergonomía Táctil y Reducción de Carga Cognitiva:**
  1. **Chips de Activos Sugeridos:** Botones de selección rápida con 1 solo toque (`ACT-2026-0001`, `SRV-BLADE-07`, `SW-CORE-01`, `ACT-2026-0002`, `SN-MPM2-2023-001`) para evitar teclear seriales largos en teclados táctiles pequeños.
  2. **Chips de Categoría con Íconos:** 6 opciones visuales táctiles (Hardware, Software, Redes, Seguridad, Infraestructura, Otro) con tamaño mínimo accesible de 44px de altura.
  3. **Tipografía Anti-Zoom:** Entradas de texto y textarea con tamaño de fuente `text-base` (16px), impidiendo que navegadores móviles (como iOS Safari) fuercen un zoom molesto al enfocar campos.
  4. **Captura Fotográfica Rápida:** Botón para activar cámara móvil (`capture="environment"`) o galería, previsualizador de imagen adjunta con peso en MB y botón de eliminación rápida, respetando el límite máximo estricto de 5MB (`MAX_FILE_SIZE_BYTES = 5242880`).
  5. **Enlace a Vista Completa:** Botón en la cabecera *"Completo"* que redirige a `frontend-web/src/views/ReporteIncidencia.jsx` (`/incidencias/nueva`) para usuarios que deseen consultar los paneles informativos extendidos.

### 4.3. Integración en Layout General: `Layout.jsx`
* **Ubicación:** `frontend-web/src/components/Layout.jsx`
* **Modificaciones:**
  * Importación y montaje de `<FabNuevaIncidencia />` al pie del contenedor estructural principal.
  * Ajuste de espaciado en `<main>`: clase `pb-24 lg:pb-6` agregada para que el contenido scrolleable tenga suficiente margen y nunca quede oculto detrás del FAB flotante.

### 4.4. Reactividad en Tiempo Real: `Incidencias.jsx`
* **Ubicación:** `frontend-web/src/views/Incidencias.jsx`
* **Modificaciones:**
  * Se agregó la escucha del evento de ventana `incidencia-creada`. Al enviarse un reporte desde el modal móvil, la lista de tarjetas y contadores se actualiza inmediatamente sin requerir recargar la página.
  * Se ajustó el botón flotante de exportación Excel a `hidden lg:flex` para no generar conflicto de posición con el FAB.

### 4.5. Corrección de Robustez: `FormularioReporteIncidencia.jsx`
* **Ubicación:** `frontend-web/src/components/FormularioReporteIncidencia.jsx`
* **Ajuste:** Se importó `useRef` y se inicializó `const fileInputRef = useRef(null);`, corrigiendo una referencia huérfana en el selector de archivos del formulario completo.

---

## 5. Pruebas y Control de Calidad

1. **Compilación de Producción (Vite):**
   * Comando ejecutado: `pnpm.cmd --dir frontend-web build`
   * Resultado: **Compilación exitosa en 897ms**, empaquetando 558 módulos sin advertencias de dependencias ni errores de sintaxis en `frontend-web/dist/`.
2. **Análisis Estático (Oxlint):**
   * Comando ejecutado: `pnpm.cmd --dir frontend-web lint`
   * Resultado: **0 errores** reportados en los 57 archivos del proyecto.
3. **Verificación de Empaquetado:**
   * Se comprobó la presencia de los identificadores `btn-fab-nueva-incidencia`, `modal-incidencia-mobile-titulo` y el evento `incidencia-creada` en el bundle de producción `dist/assets/index-*.js`.

---

## 6. Desglose Sincero de Tiempos de Ingeniería (`#time 2h`)

| Fase de Desarrollo | Duración | Detalle de Actividades Realizadas |
| :--- | :---: | :--- |
| **1. Análisis de Requerimientos y Diseño UX Móvil** | 25 min | Revisión de criterios de aceptación de TAL-172, estudio del layout responsivo (`Layout.jsx`), análisis de puntos de fricción en la creación de reportes desde móviles y diseño ergonómico de chips táctiles. |
| **2. Construcción del Componente `FabNuevaIncidencia`** | 25 min | Desarrollo del botón flotante Material Design con `rounded-full`, sombra `shadow-lg`, ícono `FiPlus` (`stroke-[2.5]`), posicionamiento fijo `bottom-6 right-6`, y lógica de ocultamiento inteligente en rutas de creación. |
| **3. Implementación del Modal Simplificado `ModalNuevaIncidenciaMobile`** | 40 min | Maquetación del bottom-sheet, chips de categorías y activos sugeridos, captura fotográfica con validación de 5MB, integración con `createIncidencia` y fallback resiliente `saveIncidencia`. |
| **4. Integración en Layout, Scroll y Reactividad** | 20 min | Incorporación en `Layout.jsx` con padding de seguridad `pb-24`, desacople del botón flotante de Excel en móviles, y sincronización reactiva vía evento `incidencia-creada` en `Incidencias.jsx`. |
| **5. Control de Calidad, Linter y Compilación Vite** | 10 min | Corrección preventiva de `fileInputRef` en `FormularioReporteIncidencia.jsx`, ejecución de `oxlint` (0 errores) y build de producción con Vite. |
| **Total Invertido Sincero** | **2h 00m** | **Cumplimiento riguroso del tiempo asignado** |

