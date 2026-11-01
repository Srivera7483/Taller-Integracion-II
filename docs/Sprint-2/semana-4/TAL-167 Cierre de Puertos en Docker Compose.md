
## Tarea de Jira
---
La tarea solicitaba cerrar los puertos para que servicios en la misma máquina no puedan entrar a los servicios PostgreSQL, pero eso impediría a los microservicio y Prisma entrar a la BD, también a PGAdmin para leer la BD.

No se cerrarán los puertos, se forzará mejor a solo aceptar conexiones a Postgres que usen la dirección IP Loopback.

### Propuesta de reescritura
---
**Objetivo:** Evitar exposición de la Base de Datos al exterior, previniendo ataques directos a PostgreSQL.

**Descripción:** Restringir la exposición pública de los contenedores PostgreSQL en `docker-compose.yml` aplicando _Local Loopback Binding_ (`127.0.0.1:PUERTO:5432`). Esto bloquea cualquier intento de conexión desde redes externas, permitiendo el acceso de forma exclusiva a los microservicios y clientes de gestión (como PgAdmin) que se ejecutan dentro de la misma máquina host.

- **Criterios de Aceptación:**
    1. Conexiones externas desde fuera del servidor host no pueden conectar a PostgreSQL directamente, pero los microservicios de NestJS sí.
        
- **Dependencias:** Docker Compose funcionando.



## Commit
---
- Modifica **docker-compose.yml** para que especifique la IP de localhost (máquina host) en lugar de dejar solo el puerto, ya que de lo contrario Docker asume la IP de red (0.0.0.0) y deja entrar a cualquier máquina en la red.

- Se comprueba la conexión impedida al usar la dirección IPv4 de red de la máquina host en lugar de la loopback (127.0.0.1 o localhost).
![[Pasted image 20261101164947.png]]