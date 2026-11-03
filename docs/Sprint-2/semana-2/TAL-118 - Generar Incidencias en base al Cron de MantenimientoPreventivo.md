
La tarea no obedecía a la naturaleza arquitectónica actual del proyecto, ya que su núcleo era en base a un trigger: "actualizar automáticamente un contador en una tabla de resumen o marcar el "Activo" vinculado con un estado REQUIERE_REVISION = true". Esas características no representan a la BD del proyecto, ni una tabla resumen ni un estado REQUIERE_REVISION.

**Entonces...** lo lógico sería cambiarlo para cumplir un propósito similar, ya hicimos el script que escaneaba y generaba la alerta en el MS Activos ahora tenemos que usar esa alerta para **generar una Incidencia.**

## Tarea de Jira
---
### Propuesta de reescritura
---
- **Objetivo:** Conectar la detección de mantenimientos preventivos programados con la creación automática de incidencias en el microservicio correspondiente.
    
- **Descripción:** Reemplazar la propuesta de triggers directos en base de datos por un flujo de comunicación entre microservicios. Cuando el servicio CronJob (`ms-activos`) identifique un mantenimiento preventivo con `fecha_programada` vencida o dentro del umbral de las próximas 24 horas, invocará de forma interna el endpoint de `ms-incidencias` (`POST /incidencias`) para registrar automáticamente una nueva incidencia de revisión preventiva asociada al `id_activo`.
    
- **Criterios de Aceptación:**
    
    1. El ejecutor del CronJob invoca con éxito la creación de la incidencia en `ms-incidencias` enviando el `id_activo`, un título genérico (_"Mantenimiento Preventivo Programado"_) y el detalle correspondiente.
    2. La incidencia generada nace en el estado inicial de su ciclo de vida (`REPORTADA` / `PENDIENTE`) para que pueda seguir el flujo normal y asignarse a una Orden de Trabajo.
    3. Se valida la existencia de incidencias preventivas abiertas para evitar la duplicación de registros sobre un mismo activo.
    4. Quedan registrados los logs de consola y auditoría por cada incidencia automatizada creada.


## Decisiones de diseño
---
#### ¿Qué comunicador usar?

* Native es más simple.
* Axios trabaja mejor con JSON, automatiza mejor con jwt, timeouts, ventajas de depuración (respuestas inmediatas).
* rabbitmq no requiere respuesta inmediata.

Tomé la decisión de usar Axios, ya que se está usando en el frontend, en ms-incidencias/ms-notificaciones temporalmente, y hace automatizaciones mejor.

Aquí tienes el código de `mantenimiento.cron.ts` completamente reescrito usando `fetch`, sin requerir de Axios ni paquetes externos:

## Commit 
---
**Tarea principal**

- Instala Axios y NestJS/Axios en **MS Activos** (`package.json` y `pnpm-lock.yaml`) (*pnpm add axios*), e importa el módulo *HttpModule* en el `AppModule` del microservicio.
- Reconfigura `MantenimientosCron.ts`:
	- Creación de la tarea programada con `@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`.
	- Lógica de consulta en la base de datos usando Prisma para buscar mantenimientos con fecha programada menor o igual a las próximas 24 horas (`fecha_programada: { lte: fechaLimite }`).
	- Integración de comunicación entre microservicios: consumo del endpoint de `ms-incidencias` mediante `HttpService` y `firstValueFrom` enviando el payload con el `id_activo`, título y estado `REPORTADA`.
	- Gestión de limpieza de registros locales y manejo de errores individualizado por cada ítem procesado para evitar bloqueos del ciclo.

**Testing**
- Instala Jest, Nest/Testing 10.4.22  y otras dependencias necesarias para el test `mantenimiento.cron.spec.ts`
- Se guarda el tipado necesario de Node y Jest en `tsconfig.json` 
- Limpiar `package.json` para que no apunte a MS incidencias, y agrega todos los scripts de Jest.
- Crea el testing unitario `mantenimientos.cron.spec.ts` mockeando.