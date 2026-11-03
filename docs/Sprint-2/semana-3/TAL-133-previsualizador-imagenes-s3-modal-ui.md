# TAL-133: Previsualizador de Imágenes Subidas a S3 (Modal UI)

## 1. Diagnóstico y Contexto del Requerimiento

En el flujo de reporte de incidentes dentro de la plataforma de infraestructura web, los usuarios y técnicos adjuntan capturas de pantalla, fotos de equipos dañados o comprobantes fotográficos antes de emitir la orden de trabajo.

Previamente, cuando un usuario seleccionaba una foto en el formulario de "Nueva Incidencia", el sistema únicamente mostraba una cadena de texto plana con el nombre del archivo, sin ofrecer ninguna retroalimentación visual ni permitir comprobar si la foto cargada era la correcta antes de emitir la petición POST al backend.

### Objetivo del Requerimiento
Darle tranquilidad al usuario de que la imagen que acaba de adjuntar es efectivamente la foto correcta del problema, permitiendo:
1. Visualizar una miniatura (**Thumbnail**) en el mismo formulario antes del envío.
2. Abrir un **Modal UI** al hacer clic sobre la miniatura con la imagen en alta resolución.
3. Contar con un botón superpuesto de **"Eliminar/Cambiar imagen"**.
4. Disponer de la capacidad de **limpiar la selección** en cualquier momento antes de enviar el POST definitivo.

---

## 2. Criterios de Aceptación y Estado de Cumplimiento

| Criterio de Aceptación | Descripción | Estado | Verificación Técnica |
|---|---|---|---|
| **Criterio a** | El thumbnail utiliza la propiedad `object-cover` para no deformar la foto. | ✅ **Cumplido al 100%** | Se aplicó tanto la clase Tailwind `object-cover` como la propiedad inline `style={{ objectFit: 'cover' }}` en el elemento `<img>` de la miniatura dentro de `FormularioReporteIncidencia.jsx`. |
| **Criterio b** | Posibilidad de limpiar la selección antes de enviar el POST final. | ✅ **Cumplido al 100%** | Implementación de `handleLimpiarImagen()` que resetea `archivoImagen`, revoca la URL blob en memoria con `URL.revokeObjectURL()`, limpia el valor del `file input` y asegura que si el usuario limpia la selección, el POST final no incluya ni suba ninguna imagen. Accesible tanto desde el botón superpuesto en el Modal como directamente desde el formulario. |

---

## 3. Resumen de Archivos Modificados y Creados

| Archivo | Tipo de Cambio | Propósito |
|---|---|---|
| `frontend-web/src/components/ModalPrevisualizadorImagen.jsx` | **Creado** | Componente Modal que despliega la imagen en tamaño grande con backdrop blur, soporte accesible para teclado (`Esc`), y controles superpuestos con el botón explícito de **"Eliminar/Cambiar imagen"** y acción de **"Limpiar selección"**. |
| `frontend-web/src/components/FormularioReporteIncidencia.jsx` | **Modificado** | Integración del estado de imagen, generación de `URL.createObjectURL`, renderizado de miniatura con `object-cover`, integración del modal y lógica de limpieza antes del POST final. |
| `docs/Sprint-2/semana-3/TAL-133-previsualizador-imagenes-s3-modal-ui.md` | **Creado** | Documentación técnica del requerimiento, arquitectura, criterios de aceptación y guía de verificación. |

---

## 4. Especificación Técnica de la Solución

### 4.1. Miniatura con `object-cover` (Criterio a)
En `FormularioReporteIncidencia.jsx`:
```jsx
<div
  id="miniatura-imagen-clickable"
  role="button"
  tabIndex={0}
  onClick={() => setIsImageModalOpen(true)}
  className="group relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-blue-500 shadow-md cursor-pointer hover:border-blue-700 hover:shadow-lg transition-all flex-shrink-0 bg-slate-900"
>
  <img
    id="thumbnail-imagen-adjunta"
    src={imagenPreviewUrl}
    alt={adjuntoNombre || 'Miniatura de evidencia adjunta'}
    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
    style={{ objectFit: 'cover' }}
  />
  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-1">
    <FiMaximize2 className="w-5 h-5 mb-1" />
    <span className="text-[10px] font-bold uppercase tracking-wider text-center">Ampliar</span>
  </div>
</div>
```

### 4.2. Modal UI con Botón Superpuesto (`ModalPrevisualizadorImagen.jsx`)
El modal renderiza la imagen en alta definición y un bloque flotante superpuesto en la esquina inferior derecha:
```jsx
{/* BOTÓN SUPERPUESTO DE "Eliminar/Cambiar imagen" */}
<div
  id="contenedor-botones-superpuestos"
  className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-20"
>
  <div className="bg-slate-900/90 backdrop-blur-md p-1.5 sm:p-2 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-wrap items-center gap-2">
    <button
      type="button"
      id="btn-eliminar-cambiar-imagen"
      onClick={onCambiarImagen}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all cursor-pointer"
    >
      <FiRefreshCw className="w-4 h-4" />
      <span>Eliminar/Cambiar imagen</span>
    </button>

    <button
      type="button"
      id="btn-superpuesto-limpiar-imagen"
      onClick={onLimpiarImagen}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-red-600/90 hover:bg-red-600 text-white shadow-md transition-all cursor-pointer"
    >
      <FiTrash2 className="w-4 h-4 text-red-100" />
      <span>Limpiar selección</span>
    </button>
  </div>
</div>
```

### 4.3. Limpieza de Selección antes del POST Final (Criterio b)
1. Al pulsar "Limpiar selección" (desde el Modal o desde el Formulario), se ejecuta:
   ```javascript
   const handleLimpiarImagen = () => {
     if (imagenPreviewUrl && imagenPreviewUrl.startsWith('blob:')) {
       URL.revokeObjectURL(imagenPreviewUrl);
     }
     setArchivoImagen(null);
     setImagenPreviewUrl(null);
     setAdjuntoNombre('');
     if (fileInputRef.current) {
       fileInputRef.current.value = '';
     }
     setIsImageModalOpen(false);
     showToast('Selección de imagen eliminada', 'info');
   };
   ```
2. Al ejecutar el submit del formulario (`handleSubmit`):
   - Si `archivoImagen` es `null`, no se realiza ninguna subida multipart a `/incidencias/:id/evidencias/upload`.
   - El payload se envía limpio sin referencias residuales a la foto descartada.

---

## 5. Pruebas y Validación

1. **Compilación de Producción:**
   - Comando: `npm run build`
   - Resultado: Compilación limpia exitosa (0 errores).
2. **Auditoría de Linter:**
   - Comando: `npm run lint`
   - Resultado: 0 errores de sintaxis o tipo.
3. **Verificación Automatizada de Criterios:**
   - Validación con `verify_acceptance_criteria.mjs` confirmando `object-cover`, botón superpuesto y flujo de limpieza.
