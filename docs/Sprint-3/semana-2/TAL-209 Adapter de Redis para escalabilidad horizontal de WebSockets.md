
## Objetivo en Jira
---
**Objetivo:** Permitir que múltiples instancias de microservicios compartan el estado de las conexiones WebSocket sin perder mensajes entre réplicas.

**Descripción:** Levantar el servicio redis en docker-compose.yml e integrar @socket.io/redis-adapter en NestJS. Cuando una instancia emita un evento, Redis se encarga de retransmitirlo a todos los clientes conectados a otras réplicas.

**Criterios de Aceptación:** 
1. Contenedor de Redis operativo con límite de memoria de 256MB y persistencia RDB ligera. 
2. Los eventos emitidos desde una réplica son recibidos por clientes conectados a otra réplica. 
3. Resistencia a desconexiones de Redis con fallback local.

**Dependencias:** [https://alu-team-emzsoo0i.atlassian.net/browse/TAL-2](https://alu-team-emzsoo0i.atlassian.net/browse/TAL-2), [https://alu-team-emzsoo0i.atlassian.net/browse/TAL-186](https://alu-team-emzsoo0i.atlassian.net/browse/TAL-186).

## Notas
---
### ¿Qué es WebSockets?
En el modelo tradicional de solicitudes HTTP, los cambios en el sistema solo se visualizan si el usuario recarga la página y hace un `GET`. 

<span style="color:rgb(240, 116, 0)">WebSockets</span>, implementado en el proyecto mediante <span style="color:rgb(240, 116, 0)">Socket.io</span> permite un túnel de comunicación bidireccional y persistente entre el navegador del usuario (React/Vite) y el servidor (NestJS).

- Acá, servirá para que cuando se cree una incidencia, las notificaciones, alertas o actualizaciones en vivo aparezcan al instante en las pantallas de terceros: de los técnicos y administradores conectados.

### Necesidad de escalabilidad horizontal y Redis
---
Cuando un cliente se conecta por WebSocket a un microservicio, el socket TCP queda en la memoria RAM del proceso exacto de Node.js que lo atendió.
No hay comunicación entre sockets para que si un *Técnico A* crea una incidencia y la petición cae en una instancia `ms-notificaciones-1`, esa instancia la propague a los usuarios de otra instancia `ms-notificaciones-2` donde puede star conectado un *Admin B*.

##### ¿Qué es Redis y cómo soluciona este problema?
Es un servicio oficial de Socket.io para conectar la memoria local de cada instancia de Node.js con un "megáfono" centralizado Redis que se encargará de la propagaciones, mediante un sistema de Publisher-Suscribers.


### Sobre los criterios de aceptación
---
- **¿Por qué 256MB de memoria?** Dado por la IA al analizar el proyecto, 256 MB es suficiente para guardar mensajes efímeros y necesario para detener un consumo total de la RAM del servidor ante un pico de tráfico.
- **Resistencia a desconexiones de Redis:** El microservicio no crashea si Redis cae o demora en responder, sigue funcionando en modo local <span style="color:rgb(158, 158, 158)">(entregando mensajes a los clientes de su propia instancia)</span> hasta que Redis vuelva a conectarse automáticamente.

### Sobre RedisAdapter y su inicialización en Index.js
---
##### RedisAdapter.js
---
- Crea un `pubClient` (megáfono) y un `subClient` (componente que escucha lo que gritan las instancias).
- El adaptador `io.adapter()` le comunica a Socket.IO que deje de usar la memoria local y use el puente/adaptador Redis.

##### Index.js
---
Simplemente lo añadimos al ciclo de vida de Fastify: en `start()` y llamando al adapter con la función definida previamente `initRedisAdapter`.

## Commit
---
- Agrega Redis como `service` en **docker-compose.yml**.
- Agrega variables de Redis en los **.env.example** raíz y de API Gateway.
- Instala Redis en **package.json** y en el respectivo **pnpm-lock.yaml**.
- Crea **api gateway/**, y se importa en el **index.js** del API Gateway.



