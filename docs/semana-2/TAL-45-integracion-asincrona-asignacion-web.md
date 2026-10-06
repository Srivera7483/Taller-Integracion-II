# TAL-45: Integración asíncrona de asignación web

## 1. Objetivo y Alcance

Implementar el consumo asíncrono del endpoint de creación y asignación de órdenes de trabajo desde el cliente web (`frontend-web`), específicamente en el formulario del panel de asignación (`/incidencias/asignar`) accesible a través del botón **"Asignar Tecnico"** dentro del módulo de Incidencias.

### Criterios de Aceptación
1. **Envío del payload correcto al API Gateway**: Al presionar el botón `#btn-asignar-orden` (*"Asignar Orden"*), el cliente realiza una petición asíncrona HTTP `POST` hacia la ruta perimetral del API Gateway enviando la estructura esperada:
   ```json
   {
     "incidencia_id": "<id_incidencia>",
     "tecnico_id": "<id_tecnico>",
     "instrucciones": "<instrucciones_opcionales>"
   }
   ```
2. **Respuesta 200 OK / 201 Created**: Al recibir una respuesta exitosa del API Gateway (`status 200` o `201`), el formulario se limpia en su totalidad (reseteo de selectores e inputs) y la interfaz visual refleja de inmediato que la orden fue emitida mediante un banner de confirmación detallado, actualización del estado de la incidencia y registro en el panel de historial de órdenes emitidas.

---

## 2. Componentes Implementados

### 2.1. Servicio de Integración con el API Gateway (`frontend-web/src/services/ordenesService.js`)
- **`getAsignarOrdenEndpoint()`**: Resuelve dinámicamente la URL perimetral del API Gateway (`http://localhost:3000/api/incidencias/ordenes-trabajo/asignar`).
- **`crearOrdenTrabajoApi(payload)`**: Función asíncrona que:
  - Estructura y sanitiza los campos `incidencia_id`, `tecnico_id` e `instrucciones`.
  - Agrega cabeceras `Content-Type: application/json` y token JWT si el usuario inició sesión.
  - Ejecuta la petición `fetch` hacia el API Gateway.
  - Retorna estado HTTP (`status`), indicador booleano (`ok`), datos serializados y endpoint invocado.

### 2.2. Panel de Asignación Web (`frontend-web/src/views/AsignarTecnico.jsx`)
- **Integración asíncrona**: Sustituye la asignación exclusivamente estática/mock por el llamado real a `crearOrdenTrabajoApi`.
- **Limpieza del Formulario**:
  - Restablecimiento de `selectedIncidenciaId` a estado vacío.
  - Restablecimiento de `selectedTecnicoId` a estado vacío.
  - Restablecimiento de `notasInstrucciones` a cadena vacía.
  - Deshabilitación reactiva del botón `#btn-asignar-orden` hasta la selección de un nuevo par incidencia-técnico.
- **Reflejo de Orden Emitida en la Interfaz**:
  - **Banner Superior (`#banner-orden-emitida`)**: Componente destacado con badge de estado HTTP (`201 Created` / `200 OK`), código de orden generada, incidencia vinculada, técnico asignado y fecha/hora de emisión.
  - **Historial Lateral (`#seccion-ordenes-emitidas`)**: Panel dinámico que lista las órdenes de trabajo generadas durante la sesión.
  - **Sincronización de Incidencias**: La incidencia pasa a estado `Asignada` y se remueve automáticamente del listado desplegable de incidencias pendientes.
  - **Notificación Toast**: Confirmación visual flotante para el usuario supervisor.
  - **Manejo de Errores y Resiliencia**: Notificación de fallos HTTP o desconexión del Gateway con opción de simulación local 201 Created para pruebas en entornos aislados.

### 2.3. Proxy de Desarrollo (`frontend-web/vite.config.js`)
- Configuración de `server.proxy` para reenviar `/api` hacia `http://localhost:3000`, facilitando la resolución de red durante el desarrollo y eliminando restricciones de CORS.

---

## 3. Flujo de Ejecución

```
[ Usuario / Supervisor en /incidencias/asignar ]
                      │
                      │ 1. Selecciona Incidencia y Técnico (+ Instrucciones)
                      │ 2. Clic en "Asignar Orden"
                      ▼
            [ AsignarTecnico.jsx ]
                      │
                      │ 3. POST /api/incidencias/ordenes-trabajo/asignar
                      │    Payload: { incidencia_id, tecnico_id, instrucciones }
                      ▼
               [ API Gateway :3000 ]
                      │
                      │ 4. Reenvía a ms-incidencias: http://localhost:3002/ordenes-trabajo/asignar
                      ▼
            [ MS Incidencias :3002 ]
                      │
                      │ 5. Transacción atómica en BD y retorno de OrdenTrabajo
                      ▼
               [ 201 Created / 200 OK ]
                      │
                      ▼
            [ AsignarTecnico.jsx ]
         ┌────────────┴────────────┐
         ▼                         ▼
 [ Formulario Limpio ]   [ Interfaz Refleja Orden ]
 - Select Incidencia = "" - Banner #banner-orden-emitida
 - Select Técnico = ""    - Código Orden, Técnico, Hora
 - Instrucciones = ""     - Incidencia pasa a "Asignada"
 - Botón deshabilitado    - Toast de confirmación
```

---

## 4. Verificación y Calidad

- **Linter (`oxlint`)**: Ejecutado sin errores (`0 errors`).
- **Compilación de producción (`vite build`)**: Verificada y aprobada en verde (45 módulos transformados, 0 fallos).
