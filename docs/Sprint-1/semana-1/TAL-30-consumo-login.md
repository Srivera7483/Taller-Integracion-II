# TAL-30: Consumo de endpoint de login desde Frontend

## 1. Información de la Tarea
- **ID:** TAL-30
- **Nombre:** Consumo de endpoint de login desde Frontend
- **Objetivo:** Desarrollar la función asíncrona que envíe las credenciales al API Gateway y almacene el token recibido de forma local persistente.

## 2. Diagnóstico previo

- La vista de autenticación (`Login.jsx`) estaba maquetada estáticamente pero no tenía interactividad ni estado.
- Los botones de envío no prevenían la recarga por defecto del formulario (submit).
- El API Gateway ya poseía el endpoint funcional de generación de JWT (`POST /api/v1/auth/login`), pero el frontend no lo estaba invocando.

## 3. Implementación

Se integró la capa de control y lógica asíncrona sobre la UI del Login.

1. **Gestión de Estado**: Se implementaron hooks `useState` en `Login.jsx` para almacenar el valor de los campos controlados de `email` y `password`, así como un estado transitorio `isSubmitting` para deshabilitar el botón durante la carga.
2. **Petición HTTP**: En el evento `onSubmit` del formulario, se previene la recarga (`e.preventDefault()`). Se estructura un payload JSON con las credenciales y se dispara una petición `POST` al endpoint del API Gateway (usando la API nativa de JavaScript, que posteriormente en la Semana 2 se refactorizará hacia `axios`).
3. **Persistencia (200 OK)**: Al recibir un status code exitoso, el frontend extrae el atributo del token JWT del cuerpo de la respuesta y lo inserta en la API web síncrona `localStorage.setItem('token', jwt)`.
4. **Manejo de Errores (401 Unauthorized)**: Si el servidor retorna un error (como contraseñas incorrectas), el flujo se intercepta mostrando un mensaje textual en rojo ("Credenciales inválidas") debajo del formulario para alertar al usuario.

## 4. Archivos modificados o creados

- `frontend-web/src/views/Login.jsx`: (MODIFICADO) Adición de hooks de estado, función `handleSubmit` y renderizado condicional de mensajes de error.

## 5. Flujo de Autenticación

1. El usuario completa el formulario y presiona "Ingresar".
2. React desactiva el botón momentáneamente para evitar envíos dobles.
3. El frontend envía `{ email, password }` al backend (Gateway).
4. El backend valida contra la base de datos (PostgreSQL/Auth).
   - **Caso Exitoso**: El backend responde `200 OK` con un JWT. El frontend lo guarda en `localStorage` y finaliza la ejecución.
   - **Caso Fallido**: El backend devuelve `401`. El frontend atrapa la excepción y actualiza el estado local de error `setError('Credenciales inválidas')`.

## 6. Decisión arquitectónica

Se escogió almacenar el token de sesión (JWT) dentro del **`localStorage`** del navegador.

### Motivos

- **Persistencia Larga:** A diferencia del `sessionStorage` que se borra al cerrar la pestaña, `localStorage` sobrevive a la sesión del navegador, evitando que el empleado técnico deba iniciar sesión reiteradas veces el mismo día.
- **Acceso Síncrono Directo:** Permite ser leído de forma instantánea e imperativa por Guardias de Ruta (Route Guards) y por instancias de clientes HTTP globales para inyectarlo en las cabeceras (Auth Bearer) sin latencias.

### Alternativas consideradas

**Cookies HttpOnly:** Guardar el JWT en una cookie HttpOnly configurada por el servidor backend es el método más seguro contra ataques XSS, dado que Javascript no puede leer la cookie. Sin embargo, para esta primera iteración MVP del taller, configurar CORS con credenciales cruzadas (cross-domain cookie passing) entre el frontend y el API Gateway requería configuraciones complejas en la red. `localStorage` es un estándar aceptado para SPA siempre que se acompañe con saneamiento de inputs para mitigar XSS.

## 7. Guía de pruebas

Validación funcional del formulario:

1. **Simulación de Error:** En la vista `/login`, ingresar credenciales inventadas y presionar el botón.
   - Comprobar que aparece visualmente el texto "Credenciales inválidas".
2. **Simulación Exitosa:** Ingresar datos reales configurados en el backend.
   - Presionar botón.
   - Abrir DevTools (F12) > Application > Local Storage. 
   - Confirmar que existe una clave llamada `token` y que su valor contiene una cadena JWT válida (empieza por `ey...`).

## 8. Resultado

- **Criterio 1:** El formulario de login envía correctamente un POST al API Gateway -> **Cumplido**.
- **Criterio 2:** Ante un 200 OK, el token JWT se guarda de forma persistente (LocalStorage) -> **Cumplido**.
- **Criterio 3:** Ante un 401, el formulario muestra un mensaje de error visual -> **Cumplido**.
