# TAL-111: Diseño Visual y Galería de Evidencias (Cloudinary Ready)

## 1. Diagnóstico y Contexto Previo

El sistema de gestión de infraestructura y activos tecnológicos contempla 4 roles principales de usuario: **Reportante**, **Supervisor**, **Técnico** y **Administrador**.

### Problemática Identificada
1. **Falta de Despliegue Visual de Evidencias:**
   - Si bien el modelo de base de datos relacional de `ms-incidencias` (`prisma/schema.prisma`) ya contaba con la tabla `EVIDENCIAS` y la columna `url_cloudinary`, la interfaz de usuario en el frontend web no contaba con un componente reutilizable y centralizado para que técnicos y reportantes pudieran visualizar cómodamente las fotografías del fallo reportado.
2. **Desconexión Temporal con Cloudinary (Entorno de Desarrollo):**
   - Actualmente, la plataforma SaaS externa de Cloudinary no se encuentra vinculada ni activa en el entorno local de desarrollo. 
   - No obstante, la arquitectura requería dejar **"los cables listos"**: diseñar el flujo en el que la subida del formulario dispare la petición hacia la API de Cloudinary, reciba el JSON de respuesta con `url_cloudinary` y lo persista en la base de datos.
   - Ante la ausencia temporal de respuesta de los servidores de Cloudinary, era indispensable implementar un mecanismo visual que mantenga un **símbolo de "cargando"** con animaciones fluidas, evitando que la interfaz colapse o muestre imágenes rotas antiestéticas.

---

## 2. Resumen de Archivos Modificados y Creados

| Archivo | Tipo de Cambio | Propósito |
|---|---|---|
| `frontend-web/src/components/EvidenceGallery.jsx` | **Creado** | Componente principal de galería con miniaturas responsivas, símbolo de cargando para Cloudinary, Lightbox modal interactivo y estado vacío "Sin evidencia adjunta". |
| `frontend-web/src/views/DetalleIncidencia.jsx` | **Modificado** | Integración de `<EvidenceGallery />` en la vista de detalle para reportantes, supervisores y administradores, consumiendo `apiData.evidencias` del backend. |
| `frontend-web/src/views/DetalleOrden.jsx` | **Modificado** | Integración de `<EvidenceGallery />` en la vista de órdenes de trabajo para que el técnico asignado evalúe las fotos del fallo antes de emitir su diagnóstico. |
| `frontend-web/src/components/FormularioReporteIncidencia.jsx` | **Modificado** | Conexión del flujo de subida multimedia para la futura API de Cloudinary: feedback táctil con indicador de carga y generación del payload con `url_cloudinary`. |
| `frontend-web/src/services/incidenciasStorage.js` | **Modificado** | Configuración de datos de prueba en cookies/memoria (`INC-1042` con 3 URLs Cloudinary e `INC-1041` vacía para validar el estado sin evidencias). |
| `ms-incidencias/create-evidencias.js` | **Creado** | Script de inyección Prisma para insertar 3 URLs de prueba en la columna `url_cloudinary` de la tabla `EVIDENCIAS` en PostgreSQL. |
| `ms-incidencias/package.json` | **Modificado** | Inclusión del comando npm `seed:evidencias` para ejecutar el script de inserción. |
| `docs/semana-3/TAL-111-diseno-visual-evidencias.md` | **Creado** | Documentación técnica y bitácora del ticket TAL-111. |

---

## 3. Criterios de Aceptación y Solución Implementada

### Criterio 1: Galería muestra imágenes si existen, o mensaje "Sin evidencia adjunta"
- **Estado Sin Evidencias:** Cuando la incidencia no posee registros en su arreglo de evidencias, el componente despliega un contenedor suave con borde punteado (`border-dashed`), icono neutral (`FiImage`) y el texto explícito:
  > **"Sin evidencia adjunta"**  
  > *Esta incidencia no posee capturas ni fotografías de fallas registradas en la plataforma.*
- **Estado Con Evidencias:** Si existen una o más referencias, el componente normaliza automáticamente entradas en formato de arreglo de strings (`string[]`) o de objetos Prisma (`{ id_evidencia, url_cloudinary, tipo, ... }`), mostrándolas en una cuadrícula TailwindCSS responsiva (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3`).

### Criterio 2: Diseño limpio con TailwindCSS
- Implementación de tarjetas estilizadas con bordes sutiles (`border-slate-200`), esquinas redondeadas (`rounded-2xl`), sombras suaves (`shadow-xs hover:shadow-md`) y microinteracciones de escala (`hover:scale-105`).
- Indicadores visuales mediante insignias (*badges*) en tipografía monoespaciada para certificar la detección del atributo `url_cloudinary`.

### Manejo de Espera de Cloudinary ("Símbolo de Cargando")
- Ya que Cloudinary no resuelve actualmente en el entorno local, se incorporó la función:
  ```javascript
  const gestionarEsperaCloudinary = (id, evento) => {
    setEstadosCarga((prev) => {
      if (evento === 'load_success') return { ...prev, [id]: 'cargada' };
      return { ...prev, [id]: 'cargando' };
    });
  };
  ```
- Mientras la imagen no responda del servidor externo, la miniatura expone:
  - Spinner animado central (`FiLoader animate-spin text-blue-600`).
  - Pulso radar (`animate-ping bg-blue-400`).
  - Textos descriptivos: *"Cargando imagen... Esperando respuesta de Cloudinary"*.
  - Indicador técnico: `url_cloudinary detectada`.

### Lightbox Modal Interactivo
- Al hacer clic en cualquier miniatura, se dispara el visor a pantalla completa:
  - Fondo oscuro con efecto difuminado (`bg-slate-950/80 backdrop-blur-md`).
  - Vista ampliada de la imagen o del símbolo de carga en standby.
  - Navegación entre evidencias con botones laterales y teclas de dirección (`←`, `→`).
  - Cierre rápido mediante botón `X` o la tecla `Escape`.
  - Herramienta para copiar la URL de Cloudinary directamente al portapapeles con confirmación visual interactiva (`¡Copiada!`).

---

## 4. Persistencia en Base de Datos y Script de Pruebas Prisma

Siguiendo el estándar de [ms-auth/create-user.js] se diseñó el script [ms-incidencias/create-evidencias.js]que se comunica directamente con PostgreSQL (`incidencias_db` en el puerto Docker `5434`):

### Entidades y Registros Afectados
1. **`TIPOS_EVIDENCIA`**:
   - `id_tipo_evidencia`: `1` (`"Fotografía del Fallo"`).
2. **`ESTADOS_INCIDENCIA`**:
   - `id_estado`: `1` (`"Reportada"`).
3. **`INCIDENCIAS`**:
   - `id_incidencia`: `f47ac10b-58cc-4372-a567-0e02b2c3d479`
   - `titulo`: *"Proyector con sobrecalentamiento y fallo de imagen"*
4. **`EVIDENCIAS` (Columna `url_cloudinary`)**:
   - Inyección de 3 URLs de prueba en la columna `url_cloudinary`:
     * `https://res.cloudinary.com/infra-uct/image/upload/v1728345601/evidencias/falla_panel_proyector.jpg`
     * `https://res.cloudinary.com/infra-uct/image/upload/v1728345602/evidencias/sensor_temperatura_alerta.jpg`
     * `https://res.cloudinary.com/infra-uct/image/upload/v1728345603/evidencias/conector_hdmi_danado.jpg`
5. **`ORDENES_TRABAJO`**:
   - `id_orden`: `b1c2d3e4-f5a6-7890-abcd-ef1234567890` vinculada a la incidencia para validación desde el rol de Técnico.

---

## 5. Guía de Ejecución y Pruebas en `localhost`

### 5.1. Ejecutar Semilla de Evidencias en Base de Datos
Desde la raíz del proyecto o dentro de `ms-incidencias`:
```powershell
node ms-incidencias/create-evidencias.js
# O a través del script de pnpm:
pnpm --dir ms-incidencias seed:evidencias
```

### 5.2. Iniciar el Frontend Web
```powershell
pnpm --dir frontend-web dev
```

### 5.3. Casos de Prueba Verificables en Navegador

| Caso de Prueba | URL de Prueba | Resultado Esperado |
|---|---|---|
| **Galería con 3 Evidencias (Reportante / Admin)** | `http://localhost:5173/incidencias/f47ac10b-58cc-4372-a567-0e02b2c3d479` (o `/incidencias/INC-1042`) | Se despliega la cuadrícula con las 3 miniaturas, mostrando el símbolo de cargando de Cloudinary y permitiendo abrir el Lightbox. |
| **Criterio "Sin evidencia adjunta"** | `http://localhost:5173/incidencias/INC-1041` | Se renderiza el recuadro con el mensaje exacto **"Sin evidencia adjunta"**. |
| **Galería para Técnicos (Órdenes)** | `http://localhost:5173/ordenes/b1c2d3e4-f5a6-7890-abcd-ef1234567890` (o `/ordenes/ORD-2026-001`) | El técnico visualiza las fotos del fallo en la sección superior antes de registrar el mantenimiento. |
| **Formulario de Creación con Cables Cloudinary** | `http://localhost:5173/incidencias/nueva` | Al adjuntar un archivo se aprecia la transición de carga (`FiLoader`), la URL `url_cloudinary` resultante se adhiere al reporte y se almacena en la cookie de sesión. |