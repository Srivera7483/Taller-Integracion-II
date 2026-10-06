# Perfiles de miembros

**bsoto2025**  
*September 2026*

---

## 1. Miembro 1: Arquitecto de Enrutamiento y Seguridad Backend

* **Enfoque del Sprint:** Responsable de construir la puerta de entrada de todo el sistema y asegurar la emisión de credenciales. Su trabajo dicta cómo se comunican las aplicaciones web y móvil con los microservicios subyacentes.
* **Responsabilidades Clave:**
  * Configurar el API Gateway (Kong o Nest.JS Gateway) y definir el mapeo de las rutas proxy hacia los microservicios.
  * Desarrollar la lógica criptográfica de firma de tokens JWT y el middleware global que valida estas credenciales en cada petición HTTP.
  * Programar restricciones de base de datos a través de Prisma (ej. Enums de estados) y automatizar el registro de auditoría (historial de cambios) en el microservicio de Incidencias.
  * Estructurar el modelo relacional para la subida de evidencias.
* **Interacción Tecnológica:** NestJS, API Gateway, PostgreSQL, Prisma (modelado relacional estricto).

### 1.1. Semana 1
**Dueño del Enrutamiento (API Gateway)**
* **Tarea 1:** Inicialización y variables de entorno del API Gateway.
* **Tarea 2:** Configuración de rutas proxy básicas.
* **Por qué fluye:** Sus tareas son secuenciales. Termina de levantar el proyecto y automáticamente pasa a configurar las rutas en su misma rama de código.

### 1.2. Semana 2
**Dueño de Autenticación (Backend)**
* **Tarea 1:** Desarrollo de firma y encriptación de tokens JWT.
* **Tarea 2:** Middleware de validación de claims JWT.
* **Por qué fluye:** Crea la llave criptográfica y, en la misma rama, programa el "guardia" que exige esa llave para entrar a las rutas.

### 1.3. Semana 3
**Dueño del Historial y Transiciones (Backend)**
* **Tarea 1:** Definición del enum de estados de incidencias.
* **Tarea 2:** Registro automático de historial de cambios.
* **Por qué fluye:** Restringe los textos permitidos para los estados y luego programa el disparador (trigger) que vigilará esos mismos cambios para guardarlos en auditoría.

### 1.4. Semana 4
**Dueño de Evidencias (Backend)**
* **Tarea 1:** Modelado de la entidad Evidencia.
* **Tarea 2:** Endpoint para registro de metadatos de evidencia.
* **Por qué fluye:** Estructura cómo se guardarán las pruebas de las fallas y luego abre la ruta para que la web envíe esos textos.

---

## 2. Miembro 2: Especialista en Lógica de Negocio e Integración

* **Enfoque del Sprint:** Encargado de las defensas perimetrales iniciales y de desarrollar los endpoints que actúan como puente directo con el trabajo del equipo de desarrollo móvil.
* **Responsabilidades Clave:**
  * Configurar las políticas CORS y Rate Limiting en el Gateway para prevenir bloqueos de origen cruzado y abusos.
  * Construir el endpoint de validación de códigos QR y generar el enlace de redirección exacto que consumirá la aplicación de React Native.
  * Diseñar el modelo relacional de las Órdenes de Trabajo y programar el controlador transaccional que las asigna.
  * Blindar las consultas de base de datos contra vulnerabilidades IDOR, inyectando la identidad del técnico directamente desde el token JWT.
* **Interacción Tecnológica:** NestJS, Prisma, lógicas transaccionales de PostgreSQL, contratos de API multiplataforma.

### 2.1. Semana 1
**Dueño de Seguridad (API Gateway)**
* **Tarea 1:** Implementación de políticas CORS.
* **Tarea 2:** Configuración de Rate Limiting.
* **Por qué fluye:** No necesita que el Miembro 1 termine. Puede programar el código de los middlewares de CORS y Rate Limiting en archivos separados (ej. corsMiddleware.js) y simplemente dejarlos listos para integrarlos al archivo principal cuando se unan las ramas.

### 2.2. Semana 2
**Dueño de Estandarización y QR (Backend)**
* **Tarea 1:** Endpoint de validación de activo (Escáner QR).
* **Tarea 2:** Enlace de redirección para creación de incidencias.
* **Por qué fluye:** Construye el validador del código QR y luego aprovecha esa misma lógica para generar la URL de redirección que usará la aplicación móvil.

### 2.3. Semana 3
**Dueño de Órdenes de Trabajo (Backend)**
* **Tarea 1:** Modelado de la tabla Orden de Trabajo.
* **Tarea 2:** Controlador REST para asignación de órdenes.
* **Por qué fluye:** Prepara la tabla en la base de datos y acto seguido desarrolla el endpoint que insertará registros en ella.

### 2.4. Semana 4
**Dueño de Consultas Seguras (Backend)**
* **Tarea 1:** Query y filtrado de órdenes por ID de técnico.
* **Tarea 2:** Inyección de identidad desde token en consultas.
* **Por qué fluye:** Arma la consulta SQL/ORM pesada, y luego le inyecta seguridad haciendo que saque el ID del token JWT para evitar suplantaciones.

---

## 3. Miembro 3: Ingeniero de Infraestructura y Control de Acceso (DevOps / Backend)

* **Enfoque del Sprint:** Responsable de estandarizar los entornos de desarrollo para evitar discrepancias de software en el equipo y de estructurar la lógica de permisos administrativos.
* **Responsabilidades Clave:**
  * Escribir los archivos docker-compose.yml y los scripts de inicialización de volúmenes para aislar localmente las bases de datos auth_db, activos_db e incidencias_db.
  * Levantar la estructura inicial del Microservicio de Incidencias usando Nest.JS.
  * Programar el sistema de Control de Acceso Basado en Roles (RBAC) y los endpoints exclusivos para administradores.
  * Desarrollar la máquina de estados final que permite recibir diagnósticos técnicos y procesar el cierre o rechazo de un ticket.
* **Interacción Tecnológica:** Docker, PostgreSQL (administración de contenedores), Nest.JS, Prisma (migraciones).

### 3.1. Semana 1
**Dueño de Infraestructura de Datos**
* **Tarea 1:** Configuración de servicios de BD en Docker.
* **Tarea 2:** Scripts de inicialización y persistencia local.
* **Por qué fluye:** Es un trabajo 100% aislado. Nadie más toca Docker esta semana. Construye sus archivos yml y prueba que las bases de datos levanten limpias en su propia máquina.

### 3.2. Semana 2
**Dueño del MS Incidencias (Backend)**
* **Tarea 1:** Inicialización del proyecto MS Incidencias.
* **Tarea 2:** Modelado de la tabla de Incidencias.
* **Por qué fluye:** Levanta su propio entorno aislado y crea la primera tabla fuerte del negocio. Si Docker falla, puede probar con SQLite local sin frenar su avance.

### 3.3. Semana 3
**Dueño de Roles y Permisos (Backend)**
* **Tarea 1:** Lógica de verificación de roles específicos (RBAC).
* **Tarea 2:** Endpoints de actualización de permisos.
* **Por qué fluye:** Protege las puertas verificando si eres Administrador, y luego crea las rutas exclusivas que solo los Administradores podrán pisar.

### 3.4. Semana 4
**Dueño de Cierre de Incidencias (Backend)**
* **Tarea 1:** Endpoint de recepción de diagnóstico técnico.
* **Tarea 2:** Modificación de la máquina de estados (Cierre/Rechazo).
* **Por qué fluye:** Permite guardar el texto del técnico reparador y luego habilita la transición oficial a estado Resuelta en el mismo flujo de cierre.

---

## 4. Miembro 4: Desarrollador Fullstack (Servicios Base y Visualización de Datos)

* **Enfoque del Sprint:** Trabaja en la intersección entre los microservicios y la interfaz de usuario, proveyendo estructuras robustas tanto para el almacenamiento de usuarios como para su visualización.
* **Responsabilidades Clave:**
  * Inicializar el Microservicio de Autenticación, creando las entidades de Usuarios y Roles mediante el ORM.
  * Implementar los interceptores de captura de errores y estandarizar el formato JSON de respuestas fallidas (códigos 4xx y 5xx).
  * Construir en React una tabla de datos genérica, responsiva y reutilizable, integrándola con el endpoint del catálogo de usuarios.
  * Diseñar la tarjeta/fila visual de órdenes de trabajo en el frontend, sumando controles lógicos para filtrar tareas según su estado (Pendiente, En Curso, Resuelta).
* **Interacción Tecnológica:** Nest.JS, Prisma, React.js (Vite), Tailwind CSS, consumo de APIs.

### 4.1. Semana 1
* **Tarea 1:** Inicialización del proyecto MS Autenticación.
* **Tarea 2:** Modelado de Usuarios y Roles en código.
* **Por qué fluye:** Sus dos tareas son secuenciales para él mismo. Levanta su microservicio y luego crea sus modelos. Si no tiene el Docker del Miembro 3 listo, usa una base de datos local SQLite o PostgreSQL en su PC temporalmente.

### 4.2. Semana 2
* **Tarea 1:** Interceptor de captura de errores no controlados.
* **Tarea 2:** Estructura JSON estándar para errores REST.
* **Por qué fluye:** Codifica la red de seguridad del servidor y luego define la forma exacta en que esos errores se mostrarán. Esto desbloquea el manejo de errores para el frontend.

### 4.3. Semana 3
* **Tarea 1:** Vista de tabla genérica para Panel de Control.
* **Tarea 2:** Integración de datos para catálogo de usuarios.
* **Por qué fluye:** Construye un esqueleto reutilizable de tabla con paginación, y luego lo rellena solicitando la lista de usuarios.

### 4.4. Semana 4
* **Tarea 1:** Maquetación de tarjeta/fila de orden asignada.
* **Tarea 2:** Integración de filtros visuales por estado.
* **Por qué fluye:** Diseña la tarjeta individual con los detalles del trabajo y luego construye las pestañas para filtrarlas sin tener que salir del componente.

---

## 5. Miembro 5: Arquitecto Frontend y Experiencia de Usuario (UX)

* **Enfoque del Sprint:** Dueño del andamiaje de la aplicación web. Se asegura de que la navegación sea segura, fluida y que el usuario reciba retroalimentación constante sobre sus acciones.
* **Responsabilidades Clave:**
  * Levantar el ecosistema web base con Vite y configurar el enrutador principal (React Router).
  * Integrar la función asíncrona de inicio de sesión y configurar guardias de ruta (Route Guards) para bloquear vistas privadas.
  * Desarrollar el componente global Toast/Snackbar e interceptar errores HTTP en el cliente para mostrarlos visualmente.
  * Implementar componentes de entrada de datos complejos (textos enriquecidos para diagnósticos) y maquetar los flujos de validación finales (Aprobar/Rechazar).
* **Interacción Tecnológica:** React.js, Context API/Zustand (manejo de estado global), Axios/Fetch (interceptores), Tailwind CSS.

### 5.1. Semana 1
**Dueño de la Arquitectura Web (Frontend)**
* **Tarea 1:** Estructura de carpetas y framework Frontend.
* **Tarea 2:** Configuración del enrutador principal web.
* **Por qué fluye:** Levanta el proyecto React/Vue y define las rutas vacías (ej. `/login` y `/dashboard`). No hace diseño visual, solo la "tubería" de navegación.

### 5.2. Semana 2
**Dueño del Acceso Web (Frontend)**
* **Tarea 1:** Consumo de endpoint de login desde Frontend.
* **Tarea 2:** Implementación de guardias de ruta (Route Guards).
* **Por qué fluye:** Integra el login (usando un token falso local si el Miembro 1 aún no termina) y usa ese mismo almacenamiento para bloquear o permitir la navegación en el router.

### 5.3. Semana 3
**Dueño de Retroalimentación Visual (Frontend)**
* **Tarea 1:** Componente visual Toast/Snackbar.
* **Tarea 2:** Interceptor HTTP de retroalimentación UX.
* **Por qué fluye:** Crea la alerta bonita en la esquina de la pantalla y luego configura el sistema global (axios/fetch) para disparar esa alerta automáticamente si el servidor devuelve un 400 o 500.

### 5.4. Semana 4
**Dueño de Vistas de Resolución (Frontend)**
* **Tarea 1:** Componente de texto enriquecido en frontend.
* **Tarea 2:** Vista de aprobación/rechazo para el Reportante.
* **Por qué fluye:** Crea el área de texto donde el técnico escribe su arreglo, y luego maqueta la vista donde el Reportante original evalúa si ese arreglo sirvió (aprobando o rechazando).

---

## 6. Miembro 6: Desarrollador Frontend UI y Flujos de Ingreso (Fullstack de Cierre)

* **Enfoque del Sprint:** Encargado de transformar los requerimientos de interfaz en componentes visuales funcionales y de orquestar la ingesta principal de datos al sistema.
* **Responsabilidades Clave:**
  * Maquetar el Layout Maestro (Header, Sidebar, Footer) y el formulario estático de inicio de sesión.
  * Construir el formulario de reporte de incidencias integrando validaciones estrictas en el cliente.
  * Desarrollar el panel visual de asignación de órdenes de trabajo, incluyendo selectores dinámicos, y conectarlo al backend.
  * Ejecutar una tarea transversal de "Prioridades", agregando el campo a la base de datos (NestJS/Prisma) y reflejándolo inmediatamente en la web con etiquetas de color (Tailwind).
* **Interacción Tecnológica:** React.js, Tailwind CSS, validación de formularios (ej. React Hook Form/Zod), Nest.JS (modificaciones menores de esquema).

### 6.1. Semana 1
* **Tarea 1:** Desarrollo del Layout Maestro estático.
* **Tarea 2:** Maquetación estática del inicio de sesión.
* **Por qué fluye:** Puede crear sus componentes visuales (formularios, botones, navbar) en archivos completamente aislados. Cuando el Miembro 5 termine el enrutador y unan el código, el Miembro 6 simplemente "enchufa" sus diseños en las rutas correspondientes.

### 6.2. Semana 2
**Dueño del Formulario de Ingreso (Frontend)**
* **Tarea 1:** Maquetación del formulario de reporte.
* **Tarea 2:** Validaciones de formulario y manejo de estado.
* **Por qué fluye:** Dibuja los campos y selectores, y en la misma tarde le agrega las reglas (campos obligatorios, spinners de carga) para que la vista quede 100% interactiva.

### 6.3. Semana 3
**Dueño de Asignación Web (Frontend)**
* **Tarea 1:** Maquetación del panel de asignación de órdenes.
* **Tarea 2:** Integración asíncrona de asignación web.
* **Por qué fluye:** Dibuja el panel y el selector de técnicos, y luego lo conecta para enviar el POST (puede mockear el resultado si el Miembro 2 está retrasado).

### 6.4. Semana 4
**Dueño de Urgencias (Fullstack)**
* **Tarea 1:** Actualización de BD y endpoints para "Prioridad" (Backend).
* **Tarea 2:** Implementación de indicadores de prioridad web (Frontend).
* **Por qué fluye:** Toca la base de datos para agregar el campo "Prioridad", e inmediatamente cruza la barrera para dibujar las etiquetas de color (rojo/amarillo/verde) en el frontend. Es una tarea Fullstack ideal para cerrar el sprint.