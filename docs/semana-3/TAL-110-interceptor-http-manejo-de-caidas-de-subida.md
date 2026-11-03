# TAL-110: Interceptor HTTP: Manejo de caídas de subida

## 1. Diagnóstico y Contexto Previo

Durante el desarrollo de la aplicación y la integración de la carga de evidencias fotográficas (dependencia con TAL-14), se identificó un riesgo en la experiencia de usuario y en la estabilidad de la Single Page Application (SPA). 

Si la conexión a internet fallaba o el servicio de almacenamiento (Cloudinary o el backend local) retornaba un error 4xx/5xx durante el proceso de subida de la imagen, la aplicación no contaba con un mecanismo centralizado que atrapara específicamente esta eventualidad para proveer un feedback visual amigable al usuario. Esto podía resultar en una interrupción silenciosa del servicio o en la propagación de una excepción no manejada.

El objetivo de este ticket es prevenir que la aplicación colapse ante estas situaciones, enlazando la falla de conexión o respuesta errónea al sistema global de notificaciones (Toast) de la interfaz.

---

## 2. Resumen de Archivos Modificados

| Archivo | Tipo de Cambio | Propósito |
|---|---|---|
| `frontend-web/src/components/AxiosInterceptor.jsx` | Modificado | Se añadió la lógica de intercepción global para identificar errores de red o del servidor que ocurran en las rutas de subida de imágenes, mostrando un mensaje Toast personalizado. |
| `docs/semana-3/TAL-110-interceptor-http-manejo-de-caidas-de-subida.md` | Creado | Documentación técnica del manejo de caídas de subida. |

---

## 3. Especificación Lógica del Interceptor

La mejora se concentra en el interceptor de respuestas de la instancia global de Axios (`api.interceptors.response`). Se añadieron reglas de detección tanto para **errores de respuesta del servidor (HTTP 4xx/5xx)** como para **errores de red (sin respuesta)**.

### Condiciones de Captura
El interceptor detecta si el error proviene de la subida de una evidencia revisando la URL configurada en la petición original:
- Si la URL incluye `cloudinary`.
- Si la URL incluye `/evidencias/upload` (ajuste arquitectónico adoptado en TAL-14).

Al coincidir, el interceptor sobrescribe los mensajes genéricos de fallo (ej. "Error en la solicitud al servidor" o "Error de red: No se pudo contactar al servidor") y dispara el Toast con el mensaje estricto: **"Error al subir imagen"**.

---

## 4. Decisiones Arquitectónicas y Beneficios

### 4.1. Prevención de Ruptura de la SPA
Al interceptar los errores en la capa de red y consumirlos (devolviendo `Promise.reject(error)` pero ya notificados al usuario), se previene que la aplicación de React lance pantallas de error (Error Boundaries) por promesas o caídas inesperadas que detengan el flujo del usuario. 

### 4.2. Doble Cobertura (Red y Servidor)
La validación se implementó en dos niveles fundamentales:
1. `error.response`: Cuando el servidor recibe la solicitud pero falla en guardarla (por ejemplo, timeout interno del bucket, error 500, o payload muy grande).
2. `error.request`: Cuando se produce un corte abrupto de conexión a internet o el servidor está inaccesible localmente (el entorno local fue considerado de gran importancia para el testing de caídas directas de subida).

### 4.3. Compatibilidad con TAL-14
Aunque la definición original apuntaba a interceptar caídas de "Cloudinary", se incorporó soporte directo al nuevo sistema de procesamiento local (`/evidencias/upload`) para garantizar que la característica siga cumpliendo su rol sin verse afectada por las actualizaciones recientes del backend.

---

## 5. Guía de Ejecución y Pruebas

Para probar este flujo en un entorno local de desarrollo:

### 5.1. Prueba de Error del Servidor (5xx)
1. Detener intencionalmente el procesamiento de subida en el endpoint `/evidencias/upload` de `ms-incidencias` lanzando un `throw new InternalServerErrorException()`.
2. Realizar un reporte desde el frontend y subir una imagen.
3. Se observará que la aplicación sigue funcionando y un Toast rojo despliega **"Error al subir imagen"**.

### 5.2. Prueba de Falla de Conexión en Local
1. Iniciar la aplicación y comenzar el formulario.
2. Apagar el backend (`ms-incidencias`) o desactivar la conexión a internet de la máquina.
3. Intentar subir un reporte o evidencia.
4. El interceptor capturará la falta de respuesta (`error.request`) e identificando la ruta de la subida alertará: **"Error al subir imagen"**.

---

## 6. Conclusiones y Estado del Requerimiento

- **Ticket TAL-110**: ✅ **Completado al 100%**.
- Se cumplió el criterio de aceptación "Caída de subida no rompe la SPA".
- Se cumplió el criterio de proporcionar un feedback visual claro y amigable vía el sistema global de errores (Toast).
- La intercepción funciona eficazmente tanto si se usa Cloudinary como la nueva API de backend para las evidencias.
