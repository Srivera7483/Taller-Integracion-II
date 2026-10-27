
## Tarea de Jira
---
Implementación de una tarea programada (_CronJob_ o Worker asíncrono) que se ejecute a la medianoche (00:00). Escaneará la base de datos buscando equipos cuyo tiempo de "próximo mantenimiento estimado" haya vencido o esté a menos de 24 horas, insertando automáticamente una alerta/orden de revisión preventiva.

**Objetivo:** Automatizar la gestión técnica del sistema evitando que la creación de mantenimientos dependa exclusivamente de la intervención humana.

**Criterios de Aceptación:**

- El script se ejecuta de forma aislada sin bloquear el hilo principal de Node.js.
    
- Genera registros (_logs_) de consola por cada alerta automatizada insertada.

**Dependencias:** Requiere que la estructura de la tabla Mantenimientos esté consolidada


## Commit d5d1300
---
- La tarea requiere **que la tabla Mantenimientos esté consolidada**, y tras las observaciones hechas en la fallida TAL-108, esta está mal diseñada y es incompatible con lo expuesto en el contrato OpenAPI 1.1.0 y con el diagrama MER respectivo, así que se cambió para: eliminar los campos extra *descripcion*, *tipo* y *estado*; se agregó la columna faltante *fecha_creacion*; se editó *id* por *id_mantenimiento*.
- Instala el módulo oficial de tareas de NestJS (schedule y cron en **package.json**)
- Incorpora el *ScheduleModule* en el **AppModule** de **Activos**.
- Crea el script Cron para revisar mantenimientos próximos o vencidos (**MantenimientosCron**) con las conexiones **PENDIENTES** con el MS Incidencias (el MS Activos debe disparar un evento para que MS Incidencias genere una alerta de mantenimiento pendiente).
- Elimina el archivo redundante **planificar-mantenimiento.dto.ts**