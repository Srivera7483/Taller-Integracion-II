# TAL-24: Estructura de carpetas y framework Frontend

## 1. Información de la Tarea
- **ID:** TAL-24
- **Nombre:** Estructura de carpetas y framework Frontend
- **Objetivo:** Inicializar el proyecto web (ej. Vite/React), instalando dependencias base y librerías de diseño.

## 2. Diagnóstico previo

- El repositorio contenía el código backend (Microservicios, API Gateway) pero carecía por completo del módulo de interfaz de usuario.
- Era necesario definir una tecnología base rápida, moderna y estandarizada para el desarrollo de la aplicación web, que soportara recarga rápida (HMR) y compilado optimizado.
- No existía una convención estructural para alojar vistas, componentes reutilizables o lógica de conexión.

## 3. Implementación

Se procedió a arrancar el proyecto desde cero utilizando **Vite** junto con **React**.

1. **Inicialización**: Se ejecutó el andamiaje (scaffolding) de Vite para crear el directorio `frontend-web` con la plantilla de React y JavaScript.
2. **Instalación de utilidades CSS**: Se instaló **Tailwind CSS**, junto con `postcss` y `autoprefixer`. Se configuró el archivo `tailwind.config.js` para purgar estilos no utilizados en la carpeta `src`.
3. **Estructura de Directorios**: Se eliminaron los archivos por defecto (boilerplate) y se creó una jerarquía semántica dentro de `src`:
   - `assets/`: Imágenes, iconos y fuentes estáticas.
   - `components/`: Componentes UI reutilizables (Botones, Tarjetas, Inputs).
   - `context/`: Estados globales de React (Context API).
   - `services/`: Lógica de consumo de API y almacenamiento.
   - `views/`: Páginas completas (Screens) que consumen los componentes.
4. **Verificación Estilística**: Se limpió `App.jsx` y `index.css` aplicando clases básicas de Tailwind (`bg-gray-100`, `text-blue-500`) para confirmar la correcta transpilación del CSS.

## 4. Archivos modificados o creados

- `frontend-web/package.json`: Definición del proyecto y dependencias de React/Vite/Tailwind.
- `frontend-web/vite.config.js`: (NUEVO) Configuración del bundler.
- `frontend-web/tailwind.config.js`: (NUEVO) Configuración del motor de CSS utilitario.
- `frontend-web/src/index.css`: (MODIFICADO) Inyección de directivas `@tailwind base; @tailwind components; @tailwind utilities;`.
- `frontend-web/src/...`: (NUEVO) Creación del andamiaje de carpetas vacías (`components`, `views`, etc.).

## 5. Flujo Operativo

1. El desarrollador clona el repositorio y navega a `frontend-web`.
2. Ejecuta `npm install` para descargar las dependencias.
3. Ejecuta `npm run dev`. Vite levanta un servidor de desarrollo ultrarrápido (generalmente en `http://localhost:5173`).
4. Al ingresar en el navegador, se observa la pantalla inicial limpia con los estilos de Tailwind aplicados, certificando que el pipeline de renderizado y CSS está funcionando en tiempo real (HMR).

## 6. Decisión arquitectónica

Se eligió la combinación **Vite + React + Tailwind CSS**.

### Motivos

- **Vite sobre Create React App (CRA):** Vite utiliza módulos ES nativos (ESM) en el navegador, reduciendo el tiempo de arranque de minutos a milisegundos, independientemente del tamaño del proyecto. CRA está obsoleto (deprecated).
- **Tailwind CSS:** Proporciona un sistema de diseño estandarizado por clases utilitarias. Acelera drásticamente la maquetación sin obligar al equipo a pensar nombres de clases CSS, evitando archivos `.css` gigantes e inmanejables.
- **Estructura por Tipo (Feature vs Type):** Agrupar por tipo (`components/`, `views/`) es el estándar más amigable para proyectos de escala pequeña-mediana, facilitando encontrar las vistas rápidamente a los nuevos integrantes.

### Alternativas consideradas

**Next.js (React Framework):** Next.js ofrece Server-Side Rendering (SSR) y ruteo basado en archivos. Sin embargo, para este Taller de Integración, el Frontend es un simple consumidor SPA (Single Page Application) que interactúa con un Gateway fuertemente autenticado (JWT). Un SPA puro (Vite) reduce la complejidad de infraestructura (no requiere servidor Node.js en producción, solo archivos estáticos en un S3/Nginx).

## 7. Guía de pruebas

Validación inicial de infraestructura:

1. Abrir terminal en la ruta `/frontend-web`.
2. Ejecutar `npm run dev`.
3. Navegar a la URL indicada (ej: `http://localhost:5173`).
4. Si la pantalla carga y un texto configurado con `<h1 className="text-red-500">Prueba</h1>` se visualiza de color rojo, Tailwind y Vite están correctamente acoplados.

## 8. Resultado

- **Criterio 1:** Proyecto inicializado y levantando en servidor de desarrollo local -> **Cumplido** (Vite Dev Server operando).
- **Criterio 2:** Librería de estilos configurada y verificada aplicando un estilo simple -> **Cumplido** (TailwindCSS configurado).
- **Criterio 3:** Estructura de directorios base (components, views, assets, services) creada -> **Cumplido**.
