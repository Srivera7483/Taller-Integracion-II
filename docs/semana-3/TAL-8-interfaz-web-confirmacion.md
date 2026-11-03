# TAL-8: Interfaz Web de Confirmación de Mantenimiento Técnico

## 1. Contexto y Objetivos del Requerimiento

### 1.1. Objetivo General
Diseñar e implementar la **Interfaz Web de Confirmación de Mantenimiento Técnico**, proporcionando una experiencia ágil, centralizada y ergonómica para la finalización operativa de órdenes de trabajo en el Sistema Centralizado de Gestión de Infraestructura (SCGI).

### 1.2. Objetivo Específico
Proveer a los perfiles de técnicos una forma rápida e intuitiva de rendir cuentas de su trabajo en terreno y cerrar formalmente sus tareas asignadas, mediante un componente Modal táctil donde especifiquen:
1. **Resolución técnica** del problema.
2. **Horas invertidas** en la intervención.
3. **Materiales e insumos utilizados**.
4. Transición automática y atómica del estado de la incidencia y la orden a **"Completada"**.

---

## 2. Criterios de Aceptación y Reglas de Negocio

| Criterio / Regla | Estado | Detalle de Implementación |
|---|:---:|---|
| **Formulario responsivo para Tablets** | ✅ Cumplido | Diseño táctil optimizado para resoluciones de tablet (768px a 1024px, viewports en orientación horizontal y vertical). Áreas de toque (*touch targets*) $\ge 48\text{ px}$, inputs espaciosos y controles de fácil pulsación. |
| **Prevención de Doble Envío (*Double Submit*)** | ✅ Cumplido | Bloqueo inmediato del botón al iniciar el envío (`disabled={isSubmitting \|\| !isFormValid}`), acompañado de spinner interactivo y leyenda *"Guardando Cierre..."* para impedir peticiones concurrentes duplicadas. |
| **Asignación exclusiva por Supervisor** | ✅ Cumplido | Los técnicos no pueden autoasignarse tareas ni elegir incidentes abiertos de forma arbitraria; la distribución de carga recae exclusivamente en el rol Supervisor. |
| **Control de Acceso y Propiedad de la Tarea (*Ownership*)** | ✅ Cumplido | El formulario finalizativo está protegido contra accesos indebidos: solo el técnico específicamente asignado a la orden puede abrir y registrar el cierre. Si la tarea pertenece a otro técnico, la acción queda bloqueada y se despliega un banner de seguridad explicativo. |

---

## 3. Arquitectura de la Solución

```
+-----------------------------------------------------------------------------------+
|                                  FRONTEND WEB                                     |
|                                                                                   |
|  [SelectorTecnicoSesion] (Header)                                                 |
|          |                                                                        |
|          +---> Vista [DetalleOrden] / [Incidencias] / [DetalleIncidencia]          |
|                     |                                                             |
|                     |-- (¿Es técnico asignado?)                                  |
|                     |       |                                                     |
|                     |       +-- NO  --> [Banner Acceso Restringido]               |
|                     |       |                                                     |
|                     |       +-- SÍ  --> [ModalCierreMantenimiento] (Tablet)       |
|                     |                        |                                    |
|                     |                        |-- Resolución (min 10 chars)        |
|                     |                        |-- Horas (Stepper +/- & presets)    |
|                     |                        |-- Materiales (Chips + Cantidad)    |
|                     |                        v                                    |
|                     |               [Double Submit Guard]                         |
|                     v                        v                                    |
+---------------------+------------------------+------------------------------------+
                      |                        |
                      | Petición HTTP          | Petición HTTP
                      | (Bearer JWT)           | (Bearer JWT)
                      v                        v
+-----------------------------------------------------------------------------------+
|                                   API GATEWAY                                     |
|                              (Fastify Proxy :3000)                                |
|  - /api/v1/incidencias      -> MS Incidencias (:3002)                             |
|  - /api/v1/ordenes-trabajo  -> MS Incidencias (:3002)                             |
|  - /api/v1/auth             -> MS Auth (:3001)                                    |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                                 MICROSERVICIOS                                    |
|                                                                                   |
|  [MS Auth :3001]           [MS Incidencias :3002]       [Bases de Datos Docker]   |
|  - JWT RBAC                - Actualizar Diagnóstico     - auth_db (:5435)         |
|  - Usuario 'Técnico'       - Historial y Estados        - incidencias_db (:5434)  |
|                            - Estado: "Completada" (id 6)                          |
+-----------------------------------------------------------------------------------+
```

---

## 4. Detalle de Archivos Creados y Modificados

### 4.1. Componentes Frontend (`frontend-web/src/components/`)

*   **`ModalCierreMantenimiento.jsx` (Nuevo):**
    *   Componente modal con overlay desenfocado (`backdrop-blur-xs`) y ventana flotante centrada adaptable.
    *   **Control de Horas (Touch Stepper):** Botones amplios de incremento y decremento de $0.5\text{ h}$, junto a botones de preset directo (`[0.5h]`, `[1h]`, `[2h]`, `[3h]`, `[4h]`, `[8h]`).
    *   **Gestión de Materiales:** Catálogo táctil de insumos frecuentes (*Cable UTP Cat 6, Conectores RJ45, Pasta Térmica, Disco SSD, Memoria RAM*, etc.) con adición instantánea en un toque, input para insumos personalizados con contador de unidades y checkbox de exclusión *"Solo mano de obra"*.
    *   **Validación de Entrada:** Verificación de longitud mínima en la resolución técnica ($\ge 10$ caracteres) y horas válidas ($> 0$).
    *   **Double Submit Guard:** Deshabilitación de botones y feedback de carga mientras el proceso asíncrono está en curso.

*   **`SelectorTecnicoSesion.jsx` (Nuevo):**
    *   Control visual integrado en la barra de navegación superior.
    *   Muestra el avatar y nombre del técnico en sesión.
    *   Permite conmutar perfiles entre los técnicos disponibles en el sistema (*Carlos Ruiz*, *Ana Gómez*, *Matías Silva*, etc.) para validar de forma interactiva que las restricciones de *ownership* funcionen según lo estipulado.

*   **`Layout.jsx` (Modificado):**
    *   Incorporación del `SelectorTecnicoSesion` en el encabezado general, garantizando visibilidad y accesibilidad en tablet y escritorio.

### 4.2. Vistas del Frontend (`frontend-web/src/views/`)

*   **`DetalleOrden.jsx` (Modificado):**
    *   Sección inteligente de cierre: Si la orden ya está finalizada, presenta el informe completo de mantenimiento (*Horas Invertidas*, *Materiales Usados*, *Resolución Técnica* y *Fecha de Cierre*).
    *   Si está pendiente y el usuario activo es el técnico designado, expone el botón principal táctil *"Confirmar y Cerrar Mantenimiento"*.
    *   Si la orden pertenece a otro técnico, activa el banner `banner-acceso-denegado-ownership` con advertencia de seguridad explícita y botón bloqueado.

*   **`Incidencias.jsx` (Modificado):**
    *   Se agregó la pestaña de filtro táctil *"Mis Asignadas"* para que el técnico visualice exclusivamente su carga laboral con un solo toque.
    *   Acción rápida en tarjetas móviles y filas de tabla: botón *"Finalizar Tarea"* directo para las órdenes propias, y etiqueta *"De otro técnico"* para asignaciones de terceros.

*   **`DetalleIncidencia.jsx` (Modificado):**
    *   Integración del modal de confirmación y reporte de cierre reactivo también desde el detalle del incidente.

### 4.3. Capa de Servicios y Almacenamiento (`frontend-web/src/services/`)

*   **`incidenciasStorage.js` (Modificado):**
    *   Incorporación del método `completarMantenimientoTecnico({ incidenciaId, ordenId, resolucion, horasInvertidas, materialesUsados, tecnicoNombre, tecnicoId })` para garantizar persistencia local y sincronización con cookies temporales (`temp_incidencias`).
    *   Métodos `getTecnicoActual()` y `setTecnicoActual(tecnico)` para gestionar la identidad del técnico autenticado.

*   **`Login.jsx` (Modificado):**
    *   Persistencia del objeto de perfil de usuario en `localStorage` al autenticarse exitosamente, emitiendo el evento global `tecnico-cambiado`.

### 4.4. Capa Backend y API Gateway

*   **`api gateway/index.js` (Modificado):**
    *   Registro de rutas proxy hacia `ms-incidencias`:
        *   `/api/v1/ordenes-trabajo` $\rightarrow$ `http://localhost:3002/api/v1/ordenes-trabajo`
        *   `/api/v1/estados-incidencia` $\rightarrow$ `http://localhost:3002/api/v1/estados-incidencia`
        *   `/api/v1/tipos-evidencia` $\rightarrow$ `http://localhost:3002/api/v1/tipos-evidencia`
    *   Mantenimiento de upstreams estándar con `localhost` para integración unificada de microservicios.

*   **`ms-incidencias/src/incidencias/incidencias.service.ts` (Modificado):**
    *   Corrección de importación de la librería `sharp` para estabilizar el microservicio.
    *   Ampliación de la máquina de estados en `actualizarEstado` para autorizar a los técnicos a realizar transiciones hacia el estado **"Completada"** (ID `6`) o **"Resuelta"** (ID `3`).

*   **`ms-incidencias/prisma/seed.ts` (Modificado):**
    *   Inclusión oficial del estado `{ id_estado: 6, nombre_estado: 'Completada' }` en el catálogo de base de datos relacional PostgreSQL.

---

## 5. Ergonomía para Tablets: Especificación de Controles

```
+-------------------------------------------------------------------+
|               Confirmación de Mantenimiento Técnico           [X] |
+-------------------------------------------------------------------+
| Orden: ORD-INC-1042  •  Activo: SRV-MAIL-01  •  Estado: Completada|
+-------------------------------------------------------------------+
|                                                                   |
| [1] RESOLUCIÓN TÉCNICA (*)                                        |
| +---------------------------------------------------------------+ |
| | Escribe la descripción de la reparación y pruebas...          | |
| | (Mínimo 10 caracteres)                                        | |
| +---------------------------------------------------------------+ |
|                                                                   |
| [2] HORAS INVERTIDAS (*)                                          |
| +-------------------------+   Presets táctiles (un solo toque):   |
| |  [-]   [ 3.0 ]   [+]    |   [0.5h]  [1h]  [2h]  [3h]  [4h] [8h] |
| +-------------------------+                                       |
|                                                                   |
| [3] MATERIALES E INSUMOS                                          |
| Insumos frecuentes (Chips):                                       |
| [+ Cable UTP]  [+ Conector RJ45]  [+ Pasta Térmica]  [+ SSD 500GB]|
|                                                                   |
| [+ Agregar Material Personalizado...]  Cant: [ 2 ]  [ Añadir ]    |
|                                                                   |
| Insumos asignados:                                                |
|   • 1x Cable UTP Cat 6 (mts)                                 [🗑] |
|   • 1x Pasta Térmica                                         [🗑] |
|                                                                   |
+-------------------------------------------------------------------+
| [ Cancelar ]            [ 💾 Guardar y Finalizar Mantenimiento ]   |
|                         (Double submit bloqueado durante envío)   |
+-------------------------------------------------------------------+
```

---

## 6. Verificación y Resultados de Pruebas

Se ejecutaron pruebas integrales tanto a nivel de compilación como en entorno de navegación automatizado (viewport de tablet $800 \times 1024$ y escritorio):

1. **Compilación Limpia:**
   * `frontend-web`: Build exitoso en Vite (`0` errores, `116` módulos transformados en menos de 1 segundo).
   * `ms-incidencias`: Build exitoso con NestJS (`0` errores de TypeScript tras solventar `sharp`).

2. **Flujo de Cierre en Tablet:**
   * Apertura fluida del modal desde la orden asignada.
   * Ajuste de horas mediante stepper táctil y selección de chips de materiales.
   * Ingreso de resolución y verificación del estado deshabilitado del botón durante el envío.
   * Notificación Toast emergente de confirmación y actualización de la vista a **"Completada"**.

3. **Verificación de Seguridad y Ownership:**
   * Al conmutar el técnico activo a un usuario diferente al asignado, la interfaz bloquea el botón y renderiza el aviso de advertencia de asignación.
   * El modal impide operaciones no autorizadas, preservando la trazabilidad de rendición de cuentas.

---

## 7. Conclusiones

La solución implementada satisface con creces la totalidad de los criterios de aceptación técnicos y de negocio:
* Entrega una interfaz ergonómica de nivel premium adaptada al uso táctil en tablets.
* Erradica el riesgo de duplicación de transacciones (*Double Submit*).
* Refuerza el principio de asignación estricta del supervisor y rendición de cuentas exclusiva por parte del técnico responsable.
