# TAL-183: Modal Informativo y Alerta de Sincronización Diferida (OfflineActionModal)

- **Módulos Involucrados:** `frontend-web` (`src/components/OfflineActionModal.jsx`, `src/components/FormularioReporteIncidencia.jsx`, `src/components/ModalCierreMantenimiento.jsx`, `package.json`)

---

## 1. Diagnóstico y Especificación del Requerimiento

### 1.1. Objetivo Institucional
> **Objetivo:** Notificar al usuario cuando una acción que requiere red es encolada para envío posterior.

### 1.2. Descripción Técnica
> **Descripción:** Maquetar el modal de advertencia `OfflineActionModal.jsx` informando:
> *"Estás trabajando sin conexión. Tu orden/reporte se guardará localmente y se enviará de forma automática al recuperar la señal."*
> con opción de confirmar o cancelar.

---

## 2. Criterios de Aceptación y Estado de Cumplimiento

| Criterio de Aceptación | Descripción del Requerimiento | Estado | Verificación Técnica |
| :--- | :--- | :---: | :--- |
| **Criterio 1: Diseño Coherente Claro/Oscuro** | Diseño coherente con el sistema de diseño oscuro/claro. | ✅ **Cumplido al 100%** | Aplica la paleta  `primary` `#003366`, `primary-hover` y acento ámbar/dorado de alerta `secondary` `#d97706`. En modo claro usa superficie `bg-white`, borde `border-gray-200`, texto `text-gray-900`; en modo oscuro conmuta fluidamente con `dark:bg-slate-900`, `dark:border-slate-800`, `dark:text-slate-100`. Respeta los radios normalizados `rounded-xl` y `rounded-lg` del proyecto. |
| **Criterio 2: Cierre Accesible (Escape y Click Exterior)** | Cierre accesible mediante teclado (Escape) y click exterior. | ✅ **Cumplido al 100%** | Captura `e.key === 'Escape'` mediante listener global `keydown` con remoción estricta en la fase de limpieza de `useEffect` (SonarQube). Detecta clicks exteriores en el backdrop evaluando `e.target === e.currentTarget` para prevenir cierres involuntarios al interactuar con el interior del diálogo. Bloquea el scroll del `body` (`overflow = 'hidden'`) y aplica autofoco en el botón de confirmación (`confirmButtonRef.current?.focus()`). Cumple WAI-ARIA (`role="alertdialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`). |
| **Criterio 3: Mensajes Claros Técnicos y Reportantes** | Mensajes claros orientados a técnicos y reportantes. | ✅ **Cumplido al 100%** | Provee resolución contextual según el rol de la entidad (`actionType="reporte"` vs `actionType="orden"`):<br>• **Reportantes:** Detalla el resguardo local del activo, descripción y evidencias fotográficas.<br>• **Técnicos:** Detalla el resguardo de diagnóstico técnico, horas invertidas y materiales utilizados.<br>• **Consistencia:** Incluye y valida textualmente el mensaje institucional base: *"Estás trabajando sin conexión. Tu orden/reporte se guardará localmente y se enviará de forma automática al recuperar la señal."*. |

---

## 3. Matriz de Componentes y Micro-Copys por Rol

| Perfil de Usuario | Tipo de Acción | Título del Modal | Mensaje Contextualizado | Detalle Técnico | Botón de Confirmación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Reportante** | `actionType="reporte"` | Guardar Reporte Sin Conexión | *"Estás trabajando sin conexión. Tu reporte se guardará localmente y se enviará de forma automática al recuperar la señal."* | La información del activo, descripción y evidencias fotográficas quedarán protegidas localmente. | Guardar y Encolar Reporte |
| **Técnico** | `actionType="orden"` | Guardar Orden Sin Conexión | *"Estás trabajando sin conexión. Tu orden se guardará localmente y se enviará de forma automática al recuperar la señal."* | El diagnóstico técnico, horas y materiales quedarán almacenados en la cola local de este equipo. | Guardar y Encolar Orden |
| **Genérico / Fallback** | `actionType="generic"` | Trabajar Sin Conexión | *"Estás trabajando sin conexión. Tu orden/reporte se guardará localmente y se enviará de forma automática al recuperar la señal."* | Los cambios se mantendrán a salvo en el almacenamiento local y se sincronizarán al restablecer la red. | Confirmar y Encolar |

---

## 4. Matriz de Archivos Involucrados

| Capa / Subsistema | Archivo (Ruta Relativa) | Tipo | Justificación Técnica y Razón del Cambio |
| :--- | :--- | :---: | :--- |
| **Componentes UI** | `frontend-web/src/components/OfflineActionModal.jsx` | **Creado** | Implementación del modal de advertencia de sincronización diferida. Maneja accesibilidad WAI-ARIA, paleta claro/oscuro, eventos de teclado Escape y click exterior en backdrop, y micro-copys diferenciados para técnicos y reportantes. |
| **Formularios (Reportantes)** | `frontend-web/src/components/FormularioReporteIncidencia.jsx` | **Modificado** | Integración de detección defensiva de red (`NetworkStatusContext`). Cuando el usuario intenta reportar una incidencia sin señal, se abre `OfflineActionModal`; al confirmar, encola localmente la incidencia y despliega el feedback. Si cancela, permanece editando su formulario. |
| **Formularios (Técnicos)** | `frontend-web/src/components/ModalCierreMantenimiento.jsx` | **Modificado** | Integración del modal de advertencia para órdenes de mantenimiento. Cuando el técnico completa o rechaza una orden en terreno sin señal, se le notifica que sus diagnósticos, horas y materiales quedarán en la cola local. |
| **Configuración** | `frontend-web/package.json` | **Modificado** | Actualización de `"test:unit"` para incorporar `src/components/OfflineActionModal.test.mjs` en el suite unificado de pruebas del proyecto. |
| **Pruebas Unitarias** | `frontend-web/src/components/OfflineActionModal.test.mjs` | **Creado** | Suite de pruebas unitarias con `node:test` y `node:assert/strict` verificando compatibilidad de diseño claro/oscuro, listeners de teclado Escape, backdrop click, ausencia de números mágicos (SonarQube) y textos exactos para técnicos y reportantes. |
