# TAL-50: Componente visual Toast/Snackbar

## 1. Información de la Tarea
- **ID:** TAL-50
- **Nombre:** Componente visual Toast/Snackbar
- **Objetivo:** Crear un componente de Interfaz de Usuario (UI) flotante, elegante y autogestionado para mostrar mensajes efímeros de éxito o error en la web.

## 2. Diagnóstico previo

- Para notificar errores (como en el Login) se dependía de inyectar textos de error estáticos dentro de la estructura HTML del formulario.
- Cuando una acción en otra vista tenía éxito (por ejemplo, asignar un técnico), no existía forma estandarizada de notificar al usuario, excepto forzando alertas feas nativas del navegador (`alert()`).
- Se requería una solución global que cualquier componente pudiera invocar independientemente de su posición en el árbol, y que el mensaje apareciera flotando sin alterar el Layout de la pantalla.

## 3. Implementación

Se optó por desarrollar un sistema de notificaciones globales apalancado en la Context API nativa de React y los Portales o contenedores absolutos.

1. **Contexto de React (`ToastContext.jsx`)**: Se creó un Context y un Provider (`ToastProvider`) que aloja un estado global interno con el mensaje, el tipo de variante (color) y la visibilidad. Este contexto expone un Hook personalizado (`useToast`) que provee una única función `showToast(mensaje, tipo)`.
2. **Componente Visual (`Toast.jsx`)**: Se diseñó el componente físico con clases absolutas de Tailwind (`fixed bottom-4 right-4 z-50`), asegurando que siempre flote por encima del contenido (Z-index elevado). Cuenta con variantes de color basadas en propiedades dinámicas:
   - Verde esmeralda para `success`.
   - Rojo para `error`.
   - Azul para `info`.
3. **Autocierre (Timeout)**: Dentro del Provider (o del Componente), se implementó un hook `useEffect` que, al detectar que un mensaje se muestra, dispara un `setTimeout` que revierte el estado de visibilidad a falso tras 4000 milisegundos (4 segundos), cerrando la burbuja.
4. **Acoplamiento Global**: El Provider se instaló en el nivel más alto de la aplicación (`App.jsx`), envolviendo todo el router. 

## 4. Archivos modificados o creados

- `frontend-web/src/context/ToastContext.jsx`: (NUEVO) Proveedor de estado global para controlar las notificaciones.
- `frontend-web/src/components/Toast.jsx`: (NUEVO) Componente presentacional flotante (HTML/Tailwind).
- `frontend-web/src/App.jsx`: (MODIFICADO) Envoltura de la aplicación con `<ToastProvider>`.

## 5. Flujo Operativo

1. Cualquier componente en las profundidades de la aplicación (ej: `DetalleOrden.jsx`) importa e invoca `const { showToast } = useToast()`.
2. Al desencadenarse un evento exitoso, el componente emite `showToast('Orden procesada', 'success')`.
3. El estado del `ToastProvider` cambia globalmente.
4. El componente contenedor global de `<Toast />` reacciona al nuevo estado, se dibuja en la esquina inferior derecha mostrando el texto.
5. Pasan 4 segundos, el temporizador interno expira, el estado se resetea y el Toast desaparece de la pantalla automáticamente.

## 6. Decisión arquitectónica

Se decidió implementar un Custom Context API puro de React en vez de utilizar librerías de terceros especializadas o manejadores de estado pesados como Redux.

### Motivos

- **Simplicidad:** Un sistema de notificaciones global requiere apenas dos variables en memoria (texto y color). Redux hubiera supuesto un exceso de ingeniería (Boilerplate, Actions, Reducers). Context API resuelve el problema nativamente y con alto rendimiento para este caso.
- **Evitar Dependencias:** Librerías muy populares como `react-toastify` o `react-hot-toast` añaden peso extra al bundle del frontend y traen dependencias externas. Una solución desarrollada _in-house_ con Tailwind permite un control total al milímetro sobre el diseño y las animaciones, sin "cajas negras".

### Alternativas consideradas

**Manejo de estado local por vista:** Una alternativa era que cada pantalla tuviese un `<Toast />` escrito localmente en su propio archivo. Esto se descartó rotundamente por la altísima repetición de código que generaría, forzando a declarar el estado `showToast` cientos de veces a lo largo del proyecto (violación del principio DRY).

## 7. Guía de pruebas

Validación del componente global:

1. Modificar momentáneamente el archivo `Dashboard.jsx` (o usar la consola de React DevTools) para forzar la ejecución de `showToast('Prueba exitosa', 'success')` en el render.
2. Confirmar que una caja verde emerja en la esquina superpuesta a la pantalla sin desplazar otros elementos.
3. Aguardar entre 3 a 5 segundos con un cronómetro y verificar que la notificación se esconda de la pantalla sin requerir interacción del usuario.

## 8. Resultado

- **Criterio 1:** Componente gestionado globalmente que se superpone a la vista principal -> **Cumplido** (Context API + Z-Index).
- **Criterio 2:** Acepta variantes de estilo `success`, `error`, `info` -> **Cumplido** (Estilos condicionales dinámicos Tailwind).
- **Criterio 3:** Se oculta automáticamente tras 3 a 5 segundos de ser invocado -> **Cumplido** (Timeout nativo de React).
