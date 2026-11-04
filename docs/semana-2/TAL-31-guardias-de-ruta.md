# TAL-31: Implementación de guardias de ruta (Route Guards)

## 1. Información de la Tarea
- **ID:** TAL-31
- **Nombre:** Implementación de guardias de ruta (Route Guards)
- **Objetivo:** Configurar el router para que redirija al inicio de sesión si no existe un token válido almacenado.

## 2. Diagnóstico previo

- La aplicación React utilizaba `react-router-dom` para manejar la navegación entre vistas.
- Anteriormente, cualquier usuario que ingresara manualmente la URL `/dashboard` u otras rutas protegidas podía acceder a la vista, incluso sin haber iniciado sesión.
- De la misma forma, un usuario ya autenticado podía acceder libremente a la vista `/login`.
- El comando `npm run build` compilaba sin restricciones de acceso.
- El lint (oxlint) pasaba sin problemas, pero la seguridad a nivel de UI era inexistente.

## 3. Implementación

Se crearon dos componentes funcionales envolventes (wrappers) de rutas: `ProtectedRoute.jsx` y `PublicRoute.jsx`.
Estos componentes se conectan al ciclo de renderizado de React y validan la existencia de un `token` en el `localStorage` antes de decidir qué contenido renderizar.

1. **`ProtectedRoute`**: Si no existe el token, utiliza el componente `<Navigate to="/login" replace />` para redirigir automáticamente al login y reemplazar el historial de navegación (evitando que el usuario regrese a la ruta privada usando el botón "Atrás" del navegador). Si existe el token, renderiza los hijos directos (`<Outlet />`).
2. **`PublicRoute`**: Si el token existe, asume que la sesión ya fue iniciada y redirige automáticamente a `<Navigate to="/dashboard" replace />`. Si no existe, permite visualizar el contenido (e.g. el formulario de login).
3. **`App.jsx`**: Se estructuraron las rutas usando elementos anidados para proteger grupos enteros de rutas. La ruta pública `/login` quedó bajo `<PublicRoute />`, y todo el layout privado bajo `<ProtectedRoute />`.

## 4. Archivos modificados o creados

- `frontend-web/src/components/ProtectedRoute.jsx`: (NUEVO) Wrapper para rutas que requieren sesión activa.
- `frontend-web/src/components/PublicRoute.jsx`: (NUEVO) Wrapper para rutas accesibles solo para invitados.
- `frontend-web/src/App.jsx`: (MODIFICADO) Refactorización de la definición de rutas del `BrowserRouter`.

## 5. Flujo de Navegación

1. El usuario ingresa una URL en el navegador (ej: `http://localhost:5173/dashboard`).
2. `react-router-dom` detecta que la ruta está envuelta por `<ProtectedRoute />`.
3. `ProtectedRoute` lee de forma síncrona `localStorage.getItem('token')`.
4. Al no encontrar el token, interrumpe el montaje de `<Dashboard />` y retorna `<Navigate to="/login" />`.
5. El navegador actualiza la URL inmediatamente a `/login` sin mostrar parpadeos (flashes) de la interfaz privada.

## 6. Decisión arquitectónica

Se decidió gestionar las restricciones a nivel de Router envolviendo las rutas en lugar de validar sesión dentro de cada vista (ej: poniendo un bloque `if (!token)` dentro de un `useEffect` de cada vista individual).

### Motivos

- **DRY (Don't Repeat Yourself):** Se evita escribir lógica de validación repetitiva en cada componente de la plataforma.
- **Seguridad UX:** El usuario es redirigido de manera inmediata de forma declarativa, impidiendo destellos de UI.
- **Escalabilidad:** Añadir una nueva ruta protegida es tan simple como declararla dentro del nodo correspondiente (`<ProtectedRoute>`) en `App.jsx`.

### Alternativas consideradas

**Validar estado global en lugar de localStorage:** Podríamos haber validado a través de un Contexto global de Autenticación (`AuthContext`), lo cual es reactivo. Sin embargo, dado el alcance inicial, validar directamente contra el `localStorage` cumple rápidamente con el Criterio de Aceptación manteniendo la carga inicial de la aplicación extremadamente ligera. En un futuro, el guardia de rutas podría evolucionar para no solo ver si el token existe, sino descifrarlo en el estado global para comprobar expiración (claims JWT) y permisos basados en Roles (RBAC).

## 7. Guía de pruebas

Para validar el correcto funcionamiento, se deben ejecutar los siguientes escenarios en el navegador:

**Prueba 1: Acceso bloqueado sin token**
1. Abrir las herramientas de desarrollador (F12) > Pestaña Aplicación (Application) > Local Storage.
2. Eliminar cualquier clave `token` si existe.
3. Ingresar manualmente en la barra de navegación: `http://localhost:5173/dashboard`
4. **Resultado esperado:** Redirección automática inmediata a `/login`.

**Prueba 2: Redirección automática con token**
1. Iniciar sesión exitosamente para generar un `token` (o crearlo manualmente en el `localStorage`).
2. Ingresar manualmente en la barra de navegación: `http://localhost:5173/login`
3. **Resultado esperado:** Redirección automática e inmediata a `/dashboard`. No debe permitir ver el formulario de login.

## 8. Resultado

- **Criterio 1:** Intentar navegar a `/dashboard` sin tener un token almacenado redirige a `/login` -> **Cumplido**.
- **Criterio 2:** Navegar a `/login` ya teniendo un token almacenado redirige a `/dashboard` -> **Cumplido**.
