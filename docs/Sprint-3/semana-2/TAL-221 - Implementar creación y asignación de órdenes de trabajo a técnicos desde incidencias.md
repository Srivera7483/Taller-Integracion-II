## Descripción Jira
---

Actualmente, el sistema permite registrar incidencias y consultar información de órdenes de trabajo asociadas. Sin embargo, no se ha identificado un flujo funcional completo para crear una orden de trabajo y asignarla a un técnico desde el frontend.

Se requiere implementar la gestión de asignación de incidencias mediante la entidad `ORDENES_TRABAJO`, respetando las relaciones establecidas en el MER y la autorización por permisos del sistema.

Actualmente, el sistema permite registrar incidencias (generando automáticamente una OT base sin técnico asignado, salvo en solicitudes de registro de activos) y consultar información asociada. Sin embargo, falta implementar el flujo completo para asignar o reasignar un técnico responsable desde el frontend, actualizar el historial de estados y restringir la ejecución operativa al técnico vigente.

Se requiere implementar la gestión de asignación de incidencias mediante la entidad ORDENES_TRABAJO, respetando las relaciones establecidas en el MER y la autorización por permisos del sistema.

### Objetivo

Permitir que un usuario autorizado asigne una incidencia reportada a un técnico, generando una orden de trabajo persistente y reflejando correctamente dicha asignación en la interfaz.

### Actividades

- Revisar si existe algún flujo previo de creación o asignación de órdenes de trabajo.
    
- Implementar un endpoint backend para crear una orden de trabajo asociada a una incidencia.
    
- Validar que el técnico seleccionado exista y pueda recibir asignaciones.
    
- Registrar id_incidencia e id_tecnico en ORDENES_TRABAJO.
    
- Registrar el cambio de estado a Asignada en HISTORIAL_ESTADOS.
    
- Implementar en el frontend una interfaz de asignación accesible para usuarios con el permiso correspondiente.
    
- Actualizar la vista de detalle para mostrar el técnico asignado.
    
- Integrar la pestaña «Mis Asignadas» utilizando exclusivamente el ID del técnico.
    
- Definir el comportamiento ante una nueva asignación o reasignación.
    

### Actividades adicionales para TAL-221

- Validar en el backend que únicamente el técnico efectivamente asignado mediante ORDENES_TRABAJO.id_tecnico pueda ejecutar operaciones reservadas al técnico responsable de la incidencia.
    
- Definir e implementar el comportamiento de reasignación, asegurando que «Mis Asignadas» refleje al técnico vigente y que la asignación anterior no siga apareciendo como activa.
    

### Criterios de aceptación

1. Una incidencia recién reportada (sin técnico asignado) no aparece en «Mis Asignadas» de ningún técnico.
    
2. Un usuario autorizado puede seleccionar una incidencia y asignarla (o reasignarla) a un técnico desde el frontend.
    
3. La asignación vincula el id_tecnico en ORDENES_TRABAJO (actualizando la OT sin asignar o generando una nueva entrada persistente en caso de no existir / reasignarse).
    
4. El sistema registra el estado Asignada en HISTORIAL_ESTADOS.
    
5. La incidencia aparece en «Mis Asignadas» únicamente para el técnico correspondiente.
    
6. La incidencia no aparece en «Mis Asignadas» de otros técnicos.
    
7. Al consultar el detalle, se muestra el técnico asignado utilizando la información real del sistema.
    
8. La operación exige los permisos correspondientes y rechaza accesos no autorizados.
    
9. La creación de la OT y el cambio de estado se ejecutan de manera transaccional.
    
10. Un técnico no asignado no puede resolver una incidencia ajena, aunque tenga permisos generales de resolución.
    
11. Cuando se reasigna una incidencia, únicamente el nuevo técnico aparece como responsable y el sistema conserva la trazabilidad de la operación.
    

### Dependencias

- MER y contrato API del proyecto.
- Microservicio ms-incidencias.
- Microservicio ms-auth para identificación de técnicos.
- [https://alu-team-emzsoo0i.atlassian.net/browse/TAL-97](https://alu-team-emzsoo0i.atlassian.net/browse/TAL-97) autorización basada en permisos.
- [https://alu-team-emzsoo0i.atlassian.net/browse/TAL-201](https://alu-team-emzsoo0i.atlassian.net/browse/TAL-201) lectura y visualización de asignaciones.

## Notas
---
### Evaluaciones previas
---

- El frontend **AsignarTecnico.jsx** exponía rutas incorrectas, cuando **OrdenesTrabajoController** en realidad expone `/ordenes-trabajo/asignar`.

- **OrdenesTrabajoService** e **IncidenciasService** al reasignar crean una nueva fila en `ORDENES_TRABAJO`, pero `actualizarDiagnostico` validaba `orden.id_tecnico` sobre cualquier `id_orden` histórica, y `actualizarEstado`/`resolverIncidencia` no verificaban que el técnico que llama al endpoint sea el de la OT vigente.

- La función `asignarOrden` de **OrdenesTrabajoService** no bloqueaba incidencias en estado Completada, Resuelta, Rechazada, Cerrada.

- Mocks residuales en **DetalleIncidencia.jsx** y **ModalCierreMantenimietno.jsx**


## Commit
----
### Resolución de evaluaciones previas


| archivo                                                         | modificación                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `frontend-web/src/views/AsignarTecnico.jsx`                     | • Se reemplazaron las llamadas a rutas inexistentes mencionadas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `ms-incidencias/src/ordenes-trabajo/ordenes-trabajo.service.ts` | • En `asignarOrden`, se bloqueó con `400 Bad Request` asignar o reasignar incidencias en estados cerrados (`Completada`, `Resuelta`, `Rechazada`, `Cerrada`, `Cancelada`) consultando su último estado en `HISTORIAL_ESTADOS`.<br>• En `actualizarDiagnostico`, se validó que la `id_orden` corresponda a la orden de trabajo vigente y pertenezca al técnico autenticado, rechazando con `403 Forbidden` modificaciones sobre órdenes históricas reasignadas.<br>• En `listarPorTecnico`, se filtraron las órdenes antiguas para devolver solo aquellas donde el técnico sigue vigente. |
| `ms-incidencias/src/incidencias/incidencias.service.ts`         | • Se añadió `verificarOwnershipTecnico` dentro de `actualizarEstado` y `resolverIncidencia` para impedir que un técnico modifique o cierre incidencias ajenas o reasignadas a otro usuario.                                                                                                                                                                                                                                                                                                                                                                                              |
| `frontend-web/src/views/DetalleIncidencia.jsx`                  | Se eliminaron los datos _mock_ residuales y respaldos locales (`Carlos Ruiz` / `incidenciasStorage`), consumiendo exclusivamente la información persistida en PostgreSQL.                                                                                                                                                                                                                                                                                                                                                                                                                |


### Implementación de TAL-221

| ARCHIVO                                                            | modificación                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ms-incidencias/src/ordenes-trabajo/dto/asignar-orden.dto.ts`      | • Valida `id_incidencia` e `id_tecnico` como UUID v4 obligatorios mediante `@IsUUID('4')`.<br>• Añade los campos opcionales `diagnostico_tecnico` e `instrucciones` con límite máximo de 2000 caracteres.                                                                                                                                                                                                                                                                                      |
| `ms-incidencias/src/ordenes-trabajo/ordenes-trabajo.controller.ts` | • Propaga el header `authorization` desde `POST /ordenes-trabajo/asignar` hacia el servicio para autenticar la consulta de técnicos en `ms-auth` y pasa el rol del usuario autenticado a `actualizarDiagnostico`.                                                                                                                                                                                                                                                                              |
| `ms-incidencias/src/ordenes-trabajo/ordenes-trabajo.service.ts`    | • Añade `validarTecnicoEnAuth` para verificar contra `ms-auth` que el técnico exista en BD, esté activo (`activo !== false`) y posea rol `TECNICO`.<br>• Implementa el flujo transaccional de asignación y reasignación en `asignarOrden`: evita reasignar al mismo técnico vigente, inserta una nueva fila en `ORDENES_TRABAJO` (conservando las anteriores como historial auditable), resuelve el estado `Asignada` en `EstadoIncidencia` y registra la trazabilidad en `HISTORIAL_ESTADOS`. |
| `ms-incidencias/src/incidencias/incidencias.service.ts`            | Incluye en `toApiIncidencia` (`listar` y `obtener`) los datos de la orden vigente (`id_orden`, `id_tecnico_asignado`, `orden_trabajo`) y el historial completo de asignaciones (`historial_asignaciones`) ordenado descendentemente.                                                                                                                                                                                                                                                           |
| `frontend-web/src/views/AsignarTecnico.jsx`                        | • Se habilitó el soporte dual para **asignación inicial** y **reasignación** sobre incidencias abiertas, mostrando un aviso visual con el técnico actual cuando es reasignación y deshabilitando seleccionarlo nuevamente tanto en el selector como en el panel lateral de técnicos activos.                                                                                                                                                                                                   |
| `frontend-web/src/views/Incidencias.jsx`                           | Mantiene visible el botón de acción para **Asignar** o **Reasignar** (`/incidencias/asignar?incidenciaId=...`) mientras la incidencia no esté cerrada e incorpora el filtro rápido `"Solo mis asignadas"` para usuarios con rol `TECNICO`.                                                                                                                                                                                                                                                     |
| `frontend-web/src/views/DetalleIncidencia.jsx`                     | Renderiza el técnico asignado vigente, la línea de tiempo con el historial de asignaciones/reasignaciones desde PostgreSQL, el botón de **Asignar / Reasignar Técnico** según permisos (`ordenes:asignar`) y restringe el botón de cierre/resolución exclusivamente al técnico asignado vigente.                                                                                                                                                                                               |
