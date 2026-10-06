# TAL-14: Procesamiento y Almacenamiento S3 de Imágenes

## 1. Diagnóstico y Contexto Previo

Durante el desarrollo del requerimiento para adjuntar pruebas fotográficas a las incidencias sin saturar la base de datos SQL, se abordaron los siguientes desafíos:

1. **Gestión de Archivos Multipart**:
   - Era necesario interceptar el `multipart/form-data` enviado por el frontend, garantizando seguridad y eficiencia en la carga útil de la petición.
2. **Validación de Archivos a Nivel de Controlador**:
   - Criterio de aceptación principal: Rechazar de manera inmediata cualquier formato no permitido (como `.exe`, `.pdf`) antes de siquiera instanciar la lógica de negocio.
3. **Procesamiento Eficiente de Imágenes**:
   - Dado el peso variable de las fotos tomadas por los técnicos, es necesario redimensionar e inteligentemente comprimir estas imágenes (ej. a formato WebP) para ahorrar costos de almacenamiento en volumen local o en un emulador S3.
4. **Exposición de las URLs**:
   - Las referencias de las imágenes debían almacenarse en la base de datos (`EVIDENCIAS`) y devolverse transparentemente como un arreglo en el JSON principal de la Incidencia (`INCIDENCIAS`).

---

## 2. Resumen de Archivos Modificados y Creados

| Archivo | Tipo de Cambio | Propósito |
|---|---|---|
| `ms-incidencias/package.json` | Modificado | Instalación de las librerías `multer`, `sharp`, y `uuid` (y sus types correspondientes). |
| `ms-incidencias/src/incidencias/incidencias.controller.ts` | Modificado | Inclusión del endpoint `@Post(':id_incidencia/evidencias/upload')` con `FileInterceptor` y `ParseFilePipeBuilder`. |
| `ms-incidencias/src/incidencias/incidencias.service.ts` | Modificado | Implementación de `procesarYGuardarEvidencia` (redimensionado, compresión y almacenamiento). Modificación del esquema de consulta `incidenciaConEstadoActual` para integrar el arreglo de evidencias en la respuesta. |
| `ms-incidencias/src/main.ts` | Modificado | Configuración global de `app.useStaticAssets` para exponer de forma pública la carpeta `uploads/`. |
| `docs/semana-3/TAL-14-procesamiento-y-almacenamiento-s3-de-imagenes.md` | Creado | Documentación técnica del requerimiento de procesamiento y almacenamiento de imágenes. |

---

## 3. Especificación de la API

### `POST /incidencias/:id_incidencia/evidencias/upload`

Permite a los técnicos subir una prueba fotográfica asociada a una incidencia.

#### Headers de Petición
- `Content-Type`: `multipart/form-data`

#### Parámetros y Cuerpo (Form Data)

| Parámetro | Tipo | Ubicación | Obligatorio | Descripción / Restricciones |
|---|---|---|---|---|
| `id_incidencia` | `UUID (String)` | Path Param | **Sí** | Identificador único de la incidencia. |
| `file` | `Binary (File)` | Form Data | **Sí** | Archivo de imagen. Valido solo para `/(jpg\|jpeg\|png)$/`. Rechaza `.exe` o `.pdf`. |
| `id_tipo_evidencia`| `String/Number` | Form Data | **Sí** | El ID numérico del catálogo que clasifica el tipo de evidencia proporcionada. |

---

## 4. Ejemplo de Respuesta JSON Final de la Incidencia

Al consultar o listar incidencias (ej. `GET /incidencias/:id`), el backend ahora retorna las URLs en el arreglo `evidencias`:

```json
{
  "id_incidencia": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "id_activo": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "id_reportante": "d4e5f6a7-b8c9-0123-4567-89abcdef0123",
  "titulo": "Falla en Tablero Eléctrico",
  "descripcion": "El tablero principal del sector B presenta cortocircuito visible.",
  "estado": {
    "id_estado": 2,
    "nombre_estado": "Asignada"
  },
  "evidencias": [
    "/uploads/8a1d5e3c-74a9-4b11-9a74-d02f83c271b3.webp",
    "/uploads/5f4e22a1-b3b4-4e4a-bb8d-73a46d1b229c.webp"
  ],
  "fecha_creacion": "2026-10-05T20:30:00.000Z"
}
```

---

## 5. Decisiones Arquitectónicas y Optimización de Rendimiento

### 5.1. Validación Temprana (Fail-Fast)
Al hacer uso del `ParseFilePipeBuilder` nativo de NestJS a nivel del controlador, cualquier subida malintencionada o equivocada (como un `.exe` o un `.pdf`) se rechaza con un código HTTP `422 Unprocessable Entity` antes de consumir ciclos de CPU de `sharp` o memoria adicional, garantizando protección de capa 1.

### 5.2. Procesamiento de Imagen con Sharp
Se implementó `sharp`, una librería de ultra alto rendimiento (escrita en C++ via libvips) para:
- Redimensionar la imagen a un ancho máximo de `1080px` (`withoutEnlargement: true`).
- Convertirla on-the-fly al formato altamente optimizado de la web: `WebP`, a un 80% de calidad, reduciendo el peso de la imagen entre un 60% y un 80% sin pérdida perceptible de calidad.

### 5.3. Exposición Estática (Static Assets)
La carpeta `/uploads` se configuró a nivel global en NestJS vía `app.useStaticAssets`, emulando un CDN o Bucket S3 local, permitiendo recuperar fácilmente los archivos a través de una URL pública.

---

## 6. Guía de Ejecución y Pruebas

### 6.1. Instalar las dependencias de imágenes:
```powershell
cd ms-incidencias
npm install multer sharp uuid
npm install -D @types/multer @types/uuid
```

### 6.2. Levantar el microservicio y probar la subida vía cURL:
```bash
curl -X POST http://localhost:3002/incidencias/UUID_AQUI/evidencias/upload \
  -H "Authorization: Bearer <TU_TOKEN>" \
  -F "id_tipo_evidencia=1" \
  -F "file=@/ruta/a/tu/imagen.jpg"
```

---

## 7. Conclusiones y Estado del Requerimiento

- **Ticket TAL-14**: ✅ **Completado al 100%**.
- Se cumplieron estricta y detalladamente todos los Criterios de Aceptación definidos en la especificación, manteniendo la separación de responsabilidades y la integridad técnica del microservicio de incidencias.
