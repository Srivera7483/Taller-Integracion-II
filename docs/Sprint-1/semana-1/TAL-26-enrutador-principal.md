# TAL-26: Configuración del enrutador principal web

## 1. Información de la Tarea
- **ID:** TAL-26
- **Nombre:** Configuración del enrutador principal web
- **Objetivo:** Instalar la librería de ruteo y definir el mapeo inicial de URLs (públicas vs. privadas).

## 2. Diagnóstico previo

- El proyecto frontend estaba inicializado (TAL-24), pero solo renderizaba un componente estático en la raíz (SPA de una sola vista).
- Se necesitaba la capacidad de navegar a múltiples URLs lógicas (ej: `/login`, `/dashboard`) sin recargar la página del navegador, manteniendo la fluidez de un SPA.
- Se requería que ciertas vistas contaran con un menú de navegación persistente (Layout Maestro), mientras que otras (como el Login) ocuparan toda la pantalla.

## 3. Implementación

Se integró **React Router DOM v6** para gestionar la navegación cliente.

1. **Instalación**: Se agregó `react-router-dom` al `package.json`.
2. **Definición de Vistas Mock**: Se crearon componentes básicos (`Dashboard.jsx`, `Login.jsx`) dentro de la carpeta `views` con textos de marcador de posición (Placeholders).
3. **Layout Maestro**: Se creó un componente `Layout.jsx` en `components/`. Este componente contiene el diseño envolvente (Navbar/Sidebar) y utiliza el componente especial `<Outlet />` para inyectar dinámicamente el contenido de la ruta hija en el centro de la pantalla.
4. **Árbol de Rutas (`App.jsx`)**: Se configuró el `<BrowserRouter>`. 
   - Se estableció una ruta independiente para `/login` (sin Layout).
   - Se estableció una ruta principal `/` que renderiza el `<Layout />`, y se declararon sub-rutas hijas (ej: `dashboard`, `incidencias`) dentro de este bloque, garantizando que hereden la interfaz del menú.

## 4. Archivos modificados o creados

- `frontend-web/package.json`: Inclusión de `react-router-dom`.
- `frontend-web/src/components/Layout.jsx`: (NUEVO) Plantilla maestra con barra de navegación e `<Outlet />`.
- `frontend-web/src/views/Login.jsx`: (NUEVO) Vista inicial de autenticación.
- `frontend-web/src/views/Dashboard.jsx`: (NUEVO) Vista inicial post-autenticación.
- `frontend-web/src/App.jsx`: (MODIFICADO) Declaración del mapeo estructural de `<Routes>`.

## 5. Flujo de Navegación

1. Cuando un usuario entra a `http://localhost:5173/login`, el router esquiva el `<Layout>` y carga directamente el componente `<Login />` ocupando el 100% del viewport.
2. Si el usuario escribe `http://localhost:5173/dashboard`, el router detecta que es una sub-ruta del `<Layout>`. Renderiza primero la estructura del menú superior/lateral, y dentro del `<Outlet>`, dibuja el contenido del `<Dashboard />`.
3. Navegar internamente usando componentes `<Link to="...">` intercepta la petición al servidor y cambia la vista instantáneamente mediante JavaScript (Client-side routing).

## 6. Decisión arquitectónica

Se escogió utilizar el ruteo anidado (Nested Routing) introducido por React Router v6 usando `<Outlet />`.

### Motivos

- **Reutilización de Layouts:** Evita tener que importar e insertar manualmente el componente `<Navbar />` o `<Sidebar />` en la parte superior de cada uno de los archivos de vistas (`Dashboard.jsx`, `Incidencias.jsx`, etc.).
- **Optimización de renderizado (Reconciliation):** Al navegar entre vistas hijas del Layout, React entiende que el Layout no ha cambiado, por lo que no vuelve a renderizar el menú, ahorrando consumo de CPU y evitando parpadeos visuales.

### Alternativas consideradas

**Ruteo tradicional (sin Outlet):** Se podría haber declarado `<Route path="/dashboard" element={<><Navbar /><Dashboard /></>} />`. Si bien funciona, a medida que la app escala y requiere múltiples layouts (ej. Admin vs Usuario), el código en `App.jsx` se vuelve inmanejable y propenso a inconsistencias.

## 7. Guía de pruebas

Validación de enrutamiento:

1. **Ruta sin Layout:** Acceder a `http://localhost:5173/login`. Asegurarse de que se vea el componente de login, pero NO haya menú de navegación visible.
2. **Ruta con Layout:** Navegar a `http://localhost:5173/dashboard`. Asegurarse de que el menú de navegación (Layout) se encuentre dibujado alrededor de la vista del Dashboard.
3. **Navegación Client-Side:** Utilizar los enlaces del menú para volver a inicio. La transición debe ocurrir sin que el ícono de carga del navegador gire.

## 8. Resultado

- **Criterio 1:** Librería de enrutamiento implementada y envolviendo la aplicación -> **Cumplido** (`BrowserRouter` envuelve `App.jsx`).
- **Criterio 2:** Navegación funcional entre al menos dos rutas (ej. /login y un /dashboard vacío) -> **Cumplido**.
- **Criterio 3:** El Layout Maestro envuelve correctamente la ruta del dashboard, pero no la ruta de login -> **Cumplido** (mediante uso de `<Outlet />` y jerarquías aisladas).
