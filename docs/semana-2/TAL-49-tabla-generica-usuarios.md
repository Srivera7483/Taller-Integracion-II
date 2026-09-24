# TAL-49: Tabla de Datos Genérica para Usuarios

## 1. Contexto del Problema
De acuerdo con el "Diagrama de Software" y los roles del "Miembro 4" del equipo, el sistema requiere una interfaz de gestión para administrar el ciclo de vida de los usuarios (Altas, Bajas, Modificaciones y visualización de roles). Se necesitaba un componente estructural que fuera escalable, dinámico y que respetara un alto estándar de diseño UX/UI.

## 2. Solución Adoptada
Se implementó un componente maestro y una vista dedicada dentro de la aplicación frontend (`React.js + Vite + TailwindCSS`):

### 2.1. Componente Reutilizable (`DataTable.jsx`)
*   **Diseño Dinámico:** Se construyó una tabla con *glassmorphism* (`backdrop-blur`), efectos hover sobre las filas (`hover:bg-blue-50/50`) y un aspecto visual premium.
*   **Funcionalidades Integradas:** 
    *   **Búsqueda en Tiempo Real:** Input con un icono de lupa que filtra iterando dinámicamente sobre todas las columnas del conjunto de datos.
    *   **Paginación Lógica:** Sistema de controles ("Anterior", "Siguiente", numeración) que particiona grandes volúmenes de datos en el cliente.
*   **Arquitectura Agnostica:** El componente recibe las `columns` (con configuraciones para formatear celdas) y la `data` como propiedades (`props`), permitiendo reutilizar esta misma tabla para "Inventarios" o "Incidencias" en el futuro.

### 2.2. Vista de Directorio (`Usuarios.jsx`)
*   Se creó la ruta `/usuarios`.
*   Se inyectó un arreglo de datos simulados (*Mock Data*) con diferentes roles y estados.
*   Se implementó una renderización personalizada para celdas (ej. avatares generados a partir de las iniciales y *badges* de estado).

### 2.3. Integración en el Enrutador
*   Se añadió la vista en `App.jsx`.
*   Se actualizó el `Layout.jsx` para incluir un botón dedicado con el icono `FiUsers` en el menú lateral de navegación.

## 3. Próximos Pasos (Deuda Técnica)
*   Reemplazar la fuente de datos simulada (Mock) conectando un servicio Axios que consuma el endpoint real `GET /api/v1/auth/users` (o equivalente) del Microservicio de Autenticación.
