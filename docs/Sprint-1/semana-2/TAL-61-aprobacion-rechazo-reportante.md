# TAL-61: Vista de aprobación/rechazo para el Reportante

## 1. Información de la Tarea
- **ID:** TAL-61
- **Nombre:** Vista de aprobación/rechazo para el Reportante
- **Objetivo:** Maquetar la interfaz e interacciones permitiendo al usuario final (Reportante) validar si la resolución de la incidencia es aceptada o rechazada.

## 2. Diagnóstico previo

- Se requería empoderar al creador de la incidencia permitiéndole emitir el visto bueno de la solución técnica.
- Como Criterio de Aceptación esencial, la botonera de validación solo puede emerger en pantalla si el backend ha transitado el `estado` de la incidencia a `"Resuelta"`. Además, en caso de Rechazo, se exige capturar la motivación justificada obligatoriamente.
- La historia poseía una dependencia estricta (blocker) indicada como: _Requiere las vistas base de detalle de incidencia_. Dicha vista base para el usuario no existía aún en el código fuente frontend.

## 3. Implementación

Para superar el bloqueo visual y poder cumplir con todos los requerimientos interactivos, la lógica se abordó de manera orquestada:

1. **Componente Resolutor Interactivo (`AprobacionReportante.jsx`)**: 
   - Genera dos botones estéticos ("Aprobar Solución" / "Rechazar").
   - **Flujo Aprobado**: Al pulsar Aprobar, emite asíncronamente el PATCH y muta localmente la vista para cerrar el incidente.
   - **Flujo Rechazado**: Al pulsar Rechazar, utiliza un estado interno (`setMostrarRechazo`) para invisibilizar la botonera inicial y realizar el despliegue automático del campo `<textarea>` obligatorio. Envía a la API el campo dinámico `motivo_rechazo`.
2. **Vista Madre de Incidencia (`DetalleIncidencia.jsx`)**:
   - Se diseñó la vista principal consumidora, capaz de obtener desde `GET /incidencias/{id_incidencia}` los pormenores (descripción, activo, estado actual).
   - Se aplicó Renderizado Condicional: `if (estado === 'Resuelta') { return <AprobacionReportante /> }`. Así se satisface la condicionalidad de negocio.
3. **Manejo Dinámico (Callback)**: El servidor y la UI mantienen sincronía fluida sin refrescar el sitio, gracias al evento `onAprobacionCompletada` que el componente le emite a su padre al terminar el proceso HTTP.
4. **Enrutador**: Se habilitó dinámicamente la nueva ruta `/incidencias/:idIncidencia` en el entorno React.

## 4. Archivos modificados o creados

- `frontend-web/src/components/AprobacionReportante.jsx`: (NUEVO) Manejador modular de la validación.
- `frontend-web/src/views/DetalleIncidencia.jsx`: (NUEVO) Vista base consumidora para mostrar los campos generales del incidente al usuario y alojar los botones.
- `frontend-web/src/App.jsx`: (MODIFICADO) Adición en el router principal.

## 5. Flujo de Validación del Usuario

1. El Reportante visualiza su incidencia: `http://localhost:5173/incidencias/INC-1000`.
2. El backend informa estado `"En Progreso"`. El componente intermedio ni siquiera se dibuja en el DOM por seguridad reactiva.
3. El técnico termina la orden, el estado cambia a `"Resuelta"`.
4. El Reportante vuelve a entrar, y ahora visualiza inmediatamente el bloque "Validar Solución" con las opciones verdes/rojas.
5. El Reportante elige "Rechazar". Los botones desaparecen (sin recargar la vista) y dan lugar al cuadro de texto "Motivo del rechazo".
6. Luego de explicar la discrepancia, se emite el request y el sistema actualiza la insignia superior del estado automáticamente.

## 6. Decisión arquitectónica

Se priorizó un mecanismo de Despliegue Condicional en-línea (UI Toggles por Estado) para procesar el motivo del rechazo en contraposición a las redirecciones a otras páginas o modales flotantes.

### Motivos

- **Flujo Ininterrumpido (UX Cognitiva):** El Reportante se mantiene sobre la descripción original del problema (en la parte superior de la vista). Al emerger el cuadro de texto justo en el lugar del botón, goza de trazabilidad visual completa de todo el caso sin tener que abrir ventanas extrañas.
- **Validación Rápida del Cliente:** El `<textarea>` está vinculado reactivamente al botón final de rechazo, evitando llamadas HTTP inútiles hacia el backend que carezcan de justificación obligatoria.

### Alternativas consideradas

**Modales (Pop-ups) o Vistas separadas:** Diseñar un Modal para capturar el rechazo hubiese requerido la introducción de contexto z-index, portales, y manejo del estado modal. No aportaba mayor valor e interrumpía la lectura natural del reporte de incidencia para el usuario final.

## 7. Guía de pruebas

Validación manual de las aserciones funcionales:

1. **Estado Oculto (Validación de Condición):** Ingresar a la base de datos de incidencias y fijar un estado diferente a `Resuelta` (ej. `Reportada`). Navegar a `http://localhost:5173/incidencias/:id`. Confirmar la ausencia del bloque de aprobación.
2. **Simular Estado Objetivo:** Cambiar el estado a `Resuelta` o emplear el modo mock automático. Observar la aparición de los botones.
3. **Flujo Cautivo de Texto:** Pulsar "Rechazar" y observar la transición del campo. Pulsar "Enviar" con el campo vacío no deberá funcionar. Agregar texto y enviar. Validar el Toast devuelto.

## 8. Resultado

- **Criterio 1:** Si una incidencia está en estado "Resuelta", la vista del reportante muestra los botones "Aprobar" y "Rechazar" -> **Cumplido** (vía condicional JSX en `DetalleIncidencia.jsx`).
- **Criterio 2:** Al presionar "Rechazar", se despliega un campo de texto obligatorio para ingresar el motivo antes de enviar la petición al backend -> **Cumplido** (vía validación de botón disabled).
