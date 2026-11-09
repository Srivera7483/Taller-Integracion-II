


## Descripción Jira
---

**Descripción:** Modificación del archivo docker-compose.yml base para inyectar la imagen oficial de rabbitmq:3-management. Incluye la configuración de mapeo de puertos y volúmenes persistentes para evitar pérdida de datos ante reinicios. _Adicionalmente, esta tarea rescata e integra a la rama_ dev _el trabajo de código pendiente de la TAL-11, conectando los microservicios al broker mediante el patrón Publicador-Suscriptor._

**Objetivos:**

1. **Infraestructura:** Proveer la infraestructura de contenedores necesaria para soportar eventos asíncronos en el ecosistema.
2. **Desacoplamiento (Rescate TAL-11):** Romper la arquitectura monolítica implementando el SDK de RabbitMQ (@nestjs/microservices). El backend de incidencias (ms-incidencias) actuará como Productor (Producer) al registrar fallos críticos, mientras que ms-notificaciones actuará como Consumidor esclavo (Consumer) escuchando la cola e imprimiendo las alertas.
    

**Criterios de Aceptación:**

1. **Despliegue Limpio:** Ejecutar docker-compose up -d despliega el broker y permite acceso a su panel de administración web (puerto 15672) y AMQP (puerto 5672) sin conflictos.
2. **Cero Pérdida de Paquetes (Rescate TAL-11):** Los mensajes producidos ingresan a la cola incidencias_criticas y son procesados por el consumidor asegurando la entrega mediante confirmaciones explícitas (ACKs manuales configurados con noAck: false).
3. **Resiliencia (Rescate TAL-11):** Si el broker de RabbitMQ se encuentra caído, el registro de la incidencia en la base de datos PostgreSQL no se interrumpe ni bloquea la experiencia del usuario final.
    

**Dependencias:**
- Ninguna (Se levanta de forma autónoma junto a los microservicios actuales).


## Notas
---
Tuvimos que incorporar al schema.prisma de Incidencias la prioridad de la incidencia. Por lo que hubo cambios extra en los archivos aparte de esto que es lo nuclear. El funcionamiento de la prioridad dinámica y prioridad manual funcionaría así:

![[Pasted image 20261109003015.png]]
La prioridad dinámica no enviaría alertas de momento.


1. Estamos cambiando la forma en que los MS se comunican, de peticiones HTTP síncronas a un sistema de correo asíncrono con RabbitMQ. Esto que permite que si MS Incidencias quiere notificar una alerta a MS Notificaciones, el sistema es tolerante a fallas, el mensaje se guarda en el broker.
2. NestJS usa por defecto HTTP REST como protocolo de comunicación. Al instalar AMQP (*Advanced Message Queuing Protocol*), le enseñamos a usar el protocolo que RabbitMQ usa para transmitir eventos. Además de declarar la URL del broker y el nombre de la cola.
3. Luego, se requiere convertir a MS Incidencias en el Publisher: 
	- Estableciendo primero un archivo de interfaz (cotnrato de formato de mensajes enviados a la cola).
	- Creando el PublisherService que toma los datos y los empuja al broker, y creando el RabbitmqModule que lo encapsula, el cual a su vez debe ser encapsulado en el IncidenciasModule.
	- Se modifica el DTO de creación de incidencias para evaluar si una incidencia es de prioridad crítica, por lo que se pone como obligatorio ese campo.
	- Finalmente, agregamos una función para verificar si una incidencia es grave, y si es así llamamos a una función que se encarga específicamente de ese tipo de incidencia.
		- Además, inyectamos el RabbitmqProducerService en el servicio.
4. `ms-notificaciones` escuchará RabbitMQ para recibir alertas críticas de forma asíncrona, manteniendo sus endpoints HTTP para otras operaciones existentes. Así, las alertas críticas ya no dependerán de una petición HTTP directa entre microservicios.
5. ACK manual: Se configura el consumidor con `noAck: false` para evitar que RabbitMQ confirme automáticamente la recepción de los eventos. Una vez que `ms-notificaciones` recibe y registra el evento en consola, ejecuta `channel.ack(message)` para confirmar su procesamiento y permitir que el broker retire el mensaje de la cola. Si el consumidor se interrumpe antes de enviar el ACK, RabbitMQ puede volver a entregar el mensaje. La durabilidad de la cola y la persistencia de los mensajes complementan este mecanismo frente a reinicios del broker.

## Commit
---
- **Fix paralelo:** Se cambia el formulario de reporte de incidencia para validar la ID del activo antes de hacer un submit/POST.

- Modifica el **docker.compose.yml** para agregar el `rabbitmq:3-management`: puerto 5672 para viaje de datos y 15672 para panel web de administración.
	- Se configura con un volumen persistente. WHY
	- Obliga a MS-Notificaciones iniciar después de RabbitMQ.

- Instala `@nestjs/microservices` y `amqplib` en MS Incidencias y MS Notificaciones (archivos **package.json**)
- Agrega las variables de entorno necesarias en MS Incidencias y MS Notificaciones (URL del broker y nombre de la cola).
	- Se usa `localhost:5672` para el desarrollo local fuera de Docker, pero Docker usa su propia URL para el broker. WHY

- Se crea el `ms-incidencias/src/rabbitmq/interfaces/incidencia-evento.interface.ts` como contrato de formato de mensajes.
- Se crea el `ms-incidencias/src/rabbitmq/rabbitmq-producer.service.ts` como PublisherService.
- Se crea `ms-incidencias/src/rabbitmq/rabbitmq.module.ts` para encapsular el PublisherService y configurar la microaplicación.
- Modifica `ms-incidencias\src\incidencias\dto\crear-incidencia.dto.ts` para obligar el campo *prioridad*.
- Se encapsula el `RabbitmqModule` en `IncidenciasModule`: `ms-incidencias/src/incidencias/incidencias.module.ts`.
- En `IncidenciasService` se inyecta `RabbitmqProducerService` y ponemos la función de evaluación `esIncidenciaCritica(body)`


- En MS Notificaciones, en `main.ts` (arreglado porque se volvió JS) se mantiene HTTP y agrega la conexión a RabbitMQ.
- En MS Notificaciones, en `notificaciones.controller.ts` añadimos el consumidor RabbitMQ.

- Modifica el `start.ps1` para ejecutar limpiamente la BD de Incidencias, ejecutar el `package.json` de MS Notificacioones.
- Modifica el `package.json ` de MS Notificaciones para comaptibilizat NestJS en versión 10.