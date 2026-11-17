# TAL-208 — Monitoreo de salud de RabbitMQ

## Estructura existente y componentes añadidos

El repositorio ya contiene un `docker-compose.yml`, un productor de mensajes
críticos en `ms-incidencias` y un consumidor `@EventPattern('incidencia_critica')`
en `ms-notificaciones`. No existían la carpeta `scripts/`, un servicio RabbitMQ
en Compose ni una cola de mensajes fallidos.

Esta entrega completa la infraestructura local TAL-9 y añade:

- `rabbitmq/init-queues.sh`: declara de forma idempotente la cola
  `incidencias_criticas`, el exchange DLX `incidencias_criticas.dlx`, la DLQ
  `incidencias_criticas.dlq` y su binding mediante la Management API.
- El servicio RabbitMQ con Management API, puertos enlazados a loopback y
  healthcheck Docker en `docker-compose.yml`. El inicializador espera a que el
  broker esté realmente activo antes de provisionar las colas.
- El productor y el consumidor declaran la cola con los mismos argumentos DLX.
- `scripts/check-queue-health.sh`: reporte de estado del contenedor, Management
  API, consumidores, backlog, tasas de publicación/entrega y mensajes en DLQ.

### Archivos nuevos

| Ruta | Propósito |
|---|---|
| `scripts/check-queue-health.sh` | Monitor ejecutable de contenedor, colas, consumidores, tasas y DLQ. |
| `rabbitmq/init-queues.sh` | Inicialización idempotente de exchange, cola de mensajes críticos, DLQ y binding. |
| `docs/Sprint-3/semana-1/TAL-208-check-queue-health.md` | Guía de despliegue, uso, códigos de salida y arquitectura de TAL-208. |

### Archivos modificados

| Ruta | Cambio |
|---|---|
| `docker-compose.yml` | Agrega RabbitMQ Management, healthcheck, inicializador de topología y dependencias de arranque del consumidor. |
| `ms-incidencias/src/rabbitmq/rabbitmq-producer.service.ts` | Declara la cola productora con el exchange DLX y routing key configurados. |
| `ms-notificaciones/src/main.ts` | Declara la cola consumidora con argumentos DLX idénticos al productor. |
| `ms-incidencias/.env.example` | Configura la conexión local de RabbitMQ y documenta exchange DLX/routing key del productor. |
| `ms-notificaciones/.env.example` | Configura conexión local y documenta exchange DLX/routing key del consumidor. |
| `ms-incidencias/src/auth/jwt-auth.guard.ts` | Resuelve un marcador de conflicto de merge, conservando el email opcional del JWT. |
| `ms-incidencias/src/incidencias/incidencias.controller.ts` | Elimina la exportación duplicada y conserva la ruta restringida a ADMINISTRADOR. |
| `ms-incidencias/src/incidencias/incidencias.service.ts` | Elimina la implementación duplicada de exportación, conservando la que enriquece los datos relacionados. |

La carpeta `scripts/` se creó porque no existía. La documentación se agregó dentro
de `docs/Sprint-3/semana-1/`, que ya era parte de la estructura del proyecto.

La DLQ recibe mensajes que RabbitMQ rechace sin reencolarlos o que expiren/sean
descartados por una política compatible. La cola de mensajes críticos usa una
clave de enrutamiento explícita hacia la DLQ.

## Requisitos

- Docker Engine y Docker Compose.
- Bash, `curl` y `jq` para ejecutar el monitor.
- RabbitMQ Management API, habilitada por la imagen `rabbitmq:4-management`.

Los valores de usuario/contraseña predeterminados en Compose son solo para
desarrollo local. En otros entornos, definir `RABBITMQ_DEFAULT_USER` y
`RABBITMQ_DEFAULT_PASS` con credenciales propias; el script acepta
`RABBITMQ_API_USER` y `RABBITMQ_API_PASS`.

## Inicio

Desde la raíz del repositorio:

```bash
docker compose up -d rabbitmq ms-notificaciones
docker compose ps
```

Compose espera a que RabbitMQ pase su healthcheck, ejecuta `rabbitmq-setup` y
espera su finalización correcta antes de iniciar el consumidor.
La Management API local queda disponible en `http://127.0.0.1:15672`; AMQP en
`127.0.0.1:5672`.

Si `ms-incidencias` se ejecuta fuera de Docker, su configuración local debe
apuntar a `amqp://<usuario>:<contraseña>@127.0.0.1:5672` y usar los mismos
valores de `RABBITMQ_QUEUE_CRITICAS`, `RABBITMQ_DLQ_EXCHANGE` y
`RABBITMQ_DLQ_ROUTING_KEY` que el consumidor.

## Uso del monitor

En Linux, macOS o WSL:

```bash
chmod +x scripts/check-queue-health.sh
./scripts/check-queue-health.sh
```

En Git Bash también se puede ejecutar como:

```bash
bash scripts/check-queue-health.sh
```

Variables opcionales:

| Variable | Predeterminado | Descripción |
|---|---|---|
| `RABBITMQ_API_URL` | `http://127.0.0.1:15672/api` | URL base de Management API |
| `RABBITMQ_API_USER` | `inframanager` | Usuario HTTP de RabbitMQ |
| `RABBITMQ_API_PASS` | `inframanager-local` | Contraseña HTTP |
| `RABBITMQ_VHOST` | `/` | Virtual host que se revisa |
| `RABBITMQ_QUEUES` | `incidencias_criticas` | Cola o lista separada por comas |
| `RABBITMQ_DLQ_SUFFIX` | `.dlq` | Sufijo para el nombre de la DLQ |
| `RABBITMQ_CONTAINER` | `rabbitmq` | Nombre del contenedor Docker |
| `RABBITMQ_MIN_CONSUMERS` | `1` | Mínimo de consumidores activos |
| `RABBITMQ_MAX_PENDING_MESSAGES` | `1000` | Umbral de backlog que genera advertencia |
| `NO_COLOR` | sin definir | Desactiva los colores ANSI si está definido |

Ejemplo con credenciales custom:

```bash
RABBITMQ_API_USER="$RABBITMQ_DEFAULT_USER" \
RABBITMQ_API_PASS="$RABBITMQ_DEFAULT_PASS" \
bash scripts/check-queue-health.sh
```

## Estados y códigos de salida

- Verde (`OK`): contenedor y API saludables, cola declarada, consumidores por
  sobre el mínimo, backlog dentro del umbral y DLQ vacía.
- Amarillo (`WARN`): contenedor activo sin healthcheck o backlog mayor al umbral.
- Rojo (`CRITICAL`): servicio detenido, cero consumidores, cola/DLQ ausente o
  mensajes pendientes en la DLQ.
- `0`: todas las verificaciones están saludables.
- `1`: alerta operativa (amarilla o roja).
- `2`: no se puede ejecutar una verificación (falta herramienta, configuración
  inválida o Management API inaccesible).

Muestra de salida saludable (en terminal, `OK` se imprime en verde):

```text
RabbitMQ queue health report
Management API: http://127.0.0.1:15672/api
Container: rabbitmq
[OK] Contenedor: running / healthy
[OK] Management API: conexión y autenticación correctas
[OK] Cola incidencias_criticas: consumidores=1, pendientes=0, entrada=0/s, salida=0/s
[OK] DLQ incidencias_criticas.dlq: sin mensajes pendientes
Estado general: SALUDABLE
```

## Decisiones de arquitectura

Un script Bash que consulta la Management API es suficiente para una verificación
puntual desde desarrollo, CI/CD o despliegue. Evita añadir y operar una pila de
monitoreo externa para una señal simple, pero no sustituye métricas históricas,
dashboards ni alertas persistentes.

Los códigos `0`, `1` y `2` distinguen salud, alerta operativa y error de
verificación. CI/CD puede fallar ante cualquier salida distinta de cero, mientras
que los operadores pueden diferenciar colas unhealthy de un problema al contactar
la API.

El healthcheck del contenedor y la Management API son verificaciones separadas:
Docker informa el estado del proceso, y la API aporta métricas por cola. La DLQ usa un exchange/clave dedicados; la configuración de cola del productor y
consumidor se mantiene idéntica para evitar errores de `PRECONDITION_FAILED`.
