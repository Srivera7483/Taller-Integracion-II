# TAL-57: Sistema de Filtros Visuales por Estado

## 1. Contexto del Problema
A medida que el volumen de incidencias y órdenes de trabajo crecía en el listado principal (`Incidencias.jsx`), los usuarios (especialmente los perfiles *Técnicos* y *Administradores*) requerían un método veloz e intuitivo para visualizar exclusivamente las tareas de su interés (por ejemplo: "Pendientes" o "En Progreso"), sin necesidad de recurrir a la barra de búsqueda de texto manual ni desplegar dropdowns incómodos (`<select>`).

## 2. Solución Adoptada
Se implementó un patrón de diseño UI conocido como "Segmented Controls" o "Pill Tabs", acompañado de una lógica matemática en el cliente que garantiza velocidad de reacción en tiempo real.

### 2.1. Arquitectura del Componente (`StatusFilter.jsx`)
*   **Maquetación y Accesibilidad:** Se construyó una tira horizontal de botones redondeados que soporta desplazamiento (*scroll*) en dispositivos móviles sin mostrar barras intrusivas (`scrollbar-hide`).
*   **Estilos Dinámicos (TailwindCSS):** El filtro activo cambia radicalmente su *background* (azul) e incluye una sombra resaltada para contrastar inmediatamente de los filtros inactivos (blancos).
*   **Contadores de Estado (*Badges*):** Cada botón incluye un indicador numérico (`badge`) acoplado de forma condicional, que alerta al usuario cuántos elementos coinciden con esa categoría específica antes de siquiera hacer clic.

### 2.2. Lógica Reactiva (Frontend)
*   **Matemática Pre-render (`.reduce`):** Dentro del contenedor `Incidencias.jsx`, se implementó una función reductora que escanea las incidencias para agrupar y contar las apariciones de cada estado al vuelo.
*   **Fusión de Filtros:** Se reescribió la lógica del filtro de arreglo (`.filter`) para que la barra de texto de búsqueda (`terminoBusqueda`) y el filtro por estados (`filtroEstado`) puedan operar simultáneamente. Un usuario puede buscar "Teclado" *y* tener el filtro "Resuelta" activo sin que ocurran colisiones de estado.

## 3. Valor de Negocio
Este desarrollo reduce significativamente la fricción cognitiva y la cantidad de clics necesarios para llegar a un dato de valor, permitiendo a los miembros del equipo de soporte identificar embudos (muchas incidencias "Pendientes") con un solo golpe de vista.
