# TAL-59: Componente de texto enriquecido en frontend

## 1. Información de la Tarea
- **ID:** TAL-59
- **Nombre:** Componente de texto enriquecido en frontend
- **Objetivo:** Implementar el campo interactivo para permitir a un usuario de rol Técnico entregar información de diagnóstico en la orden de un trabajo, reportándolo a la API.

## 2. Diagnóstico previo

- Se requería que un usuario Técnico aportase notas finales/técnicas para dar cierre o informar avances de la Orden de Trabajo.
- No existía en el frontend una vista base (e.g. "Detalle de Orden") hacia donde direccionar e inyectar este campo o formulario interactivo.
- El contrato oficial de API definido en el archivo `openapi.yaml` dictaba que esta información debía fluir vía un `PATCH /ordenes-trabajo/{id_orden}/diagnostico`, enviando en el cuerpo del JSON el string `diagnostico_tecnico`.
- El linter (`oxlint`) y la compilación (`npm run build`) no presentaban objeciones, pero la UI estaba ausente.

## 3. Implementación

Debido a que la vista principal de la orden era un prerrequisito implícito indispensable para ubicar el formulario, el desarrollo se segmentó lógicamente en dos bloques:

1. **Componente Aislado (`DiagnosticoTecnico.jsx`)**: Se diseñó un componente modular que engloba un elemento `<textarea>`. La UI fue enriquecida estética y funcionalmente empleando utilidades de TailwindCSS (foco reactivo, bordes redondeados, íconos de `react-icons`). Este componente espera por inyección (prop) el `idOrden` para funcionar.
2. **Llamada a la API y UX**: El componente encierra la lógica transaccional. Al presionar guardar, invoca asíncronamente `api.patch` hacia el backend centralizado. En caso de recepción de status 200 o 201, dispara la alerta de éxito nativa (`useToast`). Si falla, descansa en el Interceptor Global configurado en TAL-51.
3. **Vista Base e Integración (`DetalleOrden.jsx`)**: Dado que la vista no existía, se construyó una página estructurada responsiva, que se encarga de solicitar los detalles (`GET /ordenes-trabajo/{id_orden}`) y que encapsula internamente el nuevo componente `DiagnosticoTecnico`, logrando cumplir el criterio de aceptación principal.
4. **Enrutamiento (Routing)**: Se procedió a integrar el archivo al árbol de rutas a través de un endpoint paramétrico (`/ordenes/:idOrden`).

## 4. Archivos modificados o creados

- `frontend-web/src/components/DiagnosticoTecnico.jsx`: (NUEVO) Componente responsable de capturar y emitir el diagnóstico a la API.
- `frontend-web/src/views/DetalleOrden.jsx`: (NUEVO) Vista base estructurada de presentación de la orden que aloja el componente.
- `frontend-web/src/App.jsx`: (MODIFICADO) Adición de la ruta para detalle de órdenes.

## 5. Flujo Operativo

1. El técnico ingresa a la vista de detalle, por ejemplo `http://localhost:5173/ordenes/ORD-1234`.
2. El router de React empareja el parámetro `:idOrden` obteniendo `ORD-1234`.
3. La vista asíncrona obtiene los detalles en modo solo-lectura y dibuja las tarjetas informativas (estado, técnico asignado).
4. El componente `<DiagnosticoTecnico idOrden="ORD-1234" />` se inicializa al final de la vista.
5. El técnico ingresa el informe y da clic al botón.
6. El payload es transmitido al API Gateway. Al finalizar la promesa HTTP, el botón abandona su estado `isSubmitting` y lanza un Toast de confirmación visual.

## 6. Decisión arquitectónica

Se optó decididamente por encapsular el formulario de diagnóstico en un subcomponente individual (`DiagnosticoTecnico.jsx`) en vez de escribir la lógica dentro de la vista madre (`DetalleOrden.jsx`).

### Motivos

- **Separación de Responsabilidades (SRP):** La vista de la orden solo se encarga de fetchear y mostrar los detalles en modo lectura. El componente de diagnóstico atiende exclusivamente las interacciones de escritura y validación local de formularios del técnico.
- **Portabilidad Futura:** Si a futuro el diagnóstico necesita re-alojarse como un Modal Flotante, o integrarse en una tabla del Dashboard general, el componente se exporta tal cual sin arrastrar el peso de los detalles de la orden.

### Alternativas consideradas

**Uso de una librería WYSIWYG externa (ReactQuill/Draft.js):** El título del ticket mencionaba "Componente de texto enriquecido". Sin embargo, los criterios formales de aceptación especificaban explícitamente "Se renderiza un `<textarea>`". Se priorizó una solución nativa HTML y ligera sobrecargar el tamaño final de la app (bundle) con editores enriquecidos a menos que el negocio estipule la necesidad de procesar HTML (negritas, imágenes).

## 7. Guía de pruebas

Validación manual del componente de diagnóstico:

1. **Abrir una orden existente**: En el navegador, navegar a `http://localhost:5173/ordenes/ORD-1000`.
2. **UI Bloqueante**: Constatar que el botón "Guardar Diagnóstico" permanezca grisado e inoperable (`disabled`) mientras el textarea esté vacío o posea espacios en blanco.
3. **Inserción de texto**: Escribir un pequeño texto. El botón debe activarse.
4. **Comprobación Mock/API**: Al enviar, debe surgir el Toast verde en la pantalla "Diagnóstico guardado exitosamente".

## 8. Resultado

- **Criterio 1:** Se renderiza un `<textarea>` en la vista de detalle de la orden -> **Cumplido** (a través de `DetalleOrden.jsx`).
- **Criterio 2:** Al guardar, se envía el texto al backend y se dispara el componente Toast informando el éxito de la operación -> **Cumplido**.
