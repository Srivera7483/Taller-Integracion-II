# TAL-176: Configuración de Exchanges, Queues y Dead Letter Queue (DLQ)

**Estado:** Completado  
**Rama:** `TAL-176`  
**Microservicio:** `ms-notificaciones`  
**Dependencia:** TAL-9 (Configuración inicial de infraestructura de mensajería y contenedores) — **verificada y desplegada**  
**Fecha:** 15/11/2026

---

## 1. Resumen Técnico

Se implementó la topología de mensajería avanzada en el microservicio `ms-notificaciones` para garantizar que ningún mensaje se pierda ante caídas de microservicios receptores. La topología se declara programáticamente durante el arranque del servicio y cuenta con una Dead Letter Exchange (DLX) y cola de reintentos (`dead-letter.queue`) con TTL de 5 minutos y límite máximo de 3 reintentos.

### Archivos creados (nuevos en rama TAL-176)

| Ruta | Descripción |
|------|-------------|
| `ms-notificaciones/src/rabbitmq/rabbitmq-topology.service.ts` | Declaración programática de exchanges, colas, DLX y DLQ al arranque |
| `ms-notificaciones/src/rabbitmq/rabbitmq-consumer.service.ts` | Consumidor con reintentos (máx. 3), validación de DTOs con `class-validator` y envío a DLQ |
| `ms-notificaciones/src/rabbitmq/rabbitmq-publisher.service.ts` | Publicador de eventos hacia el exchange `uct.activos.events` |
| `ms-notificaciones/src/rabbitmq/dto/notificacion-evento.dto.ts` | Contrato DTO validado para eventos de notificación |
| `ms-notificaciones/src/rabbitmq/dto/auditoria-evento.dto.ts` | Contrato DTO validado para eventos de auditoría |

### Archivos modificados

| Ruta | Cambio |
|------|--------|
| `ms-notificaciones/.env` | Agregadas variables de entorno de RabbitMQ |
| `ms-notificaciones/.env.example` | Agregadas variables de entorno de RabbitMQ con valores ejemplo |
| `ms-notificaciones/src/notificaciones/notificaciones.module.ts` | Importa `RabbitmqModule` para resolver `RabbitmqPublisherService` |
| `ms-notificaciones/src/rabbitmq/rabbitmq-consumer.service.ts` | Inyección de `RabbitmqTopologyService` para orden de inicialización; validación real de DTOs |
| `ms-notificaciones/src/rabbitmq/rabbitmq-publisher.service.ts` | Corrección de tipos de conexión/canal de amqplib |
| `ms-notificaciones/src/rabbitmq/rabbitmq-topology.service.ts` | Routing keys DLQ unificadas a `dead-letter`; TTL movido a `dead-letter.queue` |
| `docker-compose.yml` | Agregadas variables de entorno de RabbitMQ al servicio `ms-notificaciones` |

### Topología declarada (en arranque del servicio)

| Elemento | Valor | Tipo / Notas |
|----------|-------|--------------|
| Exchange principal | `uct.activos.events` | `topic`, durable |
| Dead Letter Exchange | `uct.dlx` | `topic`, durable |
| Cola de suscripción | `notificaciones.queue` | durable, binding `notificacion.#`, DLX=`uct.dlx`, DLQ-RK=`dead-letter` |
| Cola de suscripción | `auditoria.queue` | durable, binding `auditoria.#`, DLX=`uct.dlx`, DLQ-RK=`dead-letter` |
| Cola de reintentos / DLQ | `dead-letter.queue` | durable, `x-message-ttl=300000` (5 min), binding a `uct.dlx` con RK=`dead-letter` |
| Límite de reintentos | 3 | Controlado por el consumidor (`x-retry-count` en headers) |
| TTL de reintentos | 300.000 ms | 5 minutos en `dead-letter.queue` |

---

## 2. Decisiones de Arquitectura (Justificación)

### 2.1 ¿Por qué Exchange de tipo `topic` frente a `direct` o `fanout`?

Se eligió un Exchange de tipo **`topic`** para el dominio de eventos (`uct.activos.events`) por las siguientes razones:

| Criterio | `topic` (seleccionado) | `direct` | `fanout` |
|----------|------------------------|----------|----------|
| **Enrutamiento flexible por patrones** | ✅ Permite comodines (`*`, `#`) para enrutar eventos como `notificacion.#`, `auditoria.#`, `activos.*.actualizado` | ❌ Coincidencia exacta de routing key | ❌ Difunde a todas las colas (sin filtrado) |
| **Desacoplamiento** | ✅ Productores y consumidores se desconocen; solo acuerdan el nombre del exchange y patrones de routing key | ⚠️ Requiere conocer la routing key exacta | ❌ Sin desacoplamiento (todos reciben todo) |
| **Mantenibilidad** | ✅ Fácil agregar nuevos consumidores con nuevos bindings sin cambiar los productores | ⚠️ Cada nueva cola requiere routing key exacta | ❌ Imposible filtrar eventos específicos |
| **Escalabilidad del dominio** | ✅ Soporta jerarquías de eventos (ej. `activos.creado`, `activos.actualizado`, `activos.eliminado`) | ❌ Requiere una cola por combinación exacta | ❌ Genera ruido al entregar mensajes irrelevantes |

**Conclusión:** El tipo `topic` es el más adecuado para un dominio de eventos donde múltiples microservicios pueden interesarse en distintos subconjuntos de eventos, permitiendo evolución del esquema de routing sin romper consumidores existentes.

### 2.2 ¿Por qué DLX con TTL y reintentos automáticos frente a alternativas?

Se implementó una **Dead Letter Exchange (DLX)** con TTL de 5 minutos y control de 3 reintentos en lugar de las siguientes alternativas:

| Estrategia | Ventajas | Desventajas | ¿Por qué no se eligió? |
|------------|----------|-------------|----------------------|
| **DLX + TTL + reintentos automáticos** (seleccionada) | ✅ No bloquea el hilo de ejecución; ✅ No satura la BD; ✅ Mensajes no se pierden (van a DLQ); ✅ TTL evita reintentos inmediatos en cascada; ✅ Cola de inspección para depuración | ⚠️ Requiere configuración de argumentos de cola (`x-dead-letter-exchange`, etc.) | N/A — esta es la estrategia implementada |
| **Reintentos bloqueantes (síncronos)** | ✅ Simple de implementar | ❌ Bloquea el hilo del consumidor; ❌ Puede agotar conexiones; ❌ No hay aislamiento de fallos; ❌ Un mensaje "píldora venenosa" bloquea toda la cola | Se descartó por impacto en disponibilidad y rendimiento |
| **Persistencia directa en BD ante error** | ✅ Traza completa de fallos | ❌ Acopla mensajería con BD; ❌ Latencia adicional por escritura en BD; ❌ Requiere lógica de re-procesamiento desde BD | Se descartó por acoplamiento innecesario y complejidad operativa |

**Justificación de la estrategia DLX:**
- **No pérdida de mensajes:** tras 3 reintentos consecutivos fallidos, el mensaje se envía automáticamente a `dead-letter.queue` para inspección y depuración (criterio de aceptación #1).
- **No bloqueo:** el consumidor no se bloquea esperando; usa `nack` con `requeue=false` y RabbitMQ se encarga del enrutamiento vía DLX.
- **TTL de 5 minutos:** los mensajes en la cola de reintentos/DLQ expiran tras 5 minutos, evitando acumulación indefinida y permitiendo políticas de retención.
- **Desacoplamiento:** la lógica de reintentos vive en el consumidor, no en el productor ni en una base de datos externa.


---

## 3. Guía de Validación y Pruebas

### 3.1 Prerrequisitos

1. RabbitMQ en ejecución (dependencia TAL-9): `docker-compose.yml` con servicio `rabbitmq` (puertos 5672 y 15672).
2. Microservicio `ms-notificaciones` construido y en ejecución.
3. Variables de entorno cargadas (`.env` o `docker-compose.yml`).

### 3.2 Verificación de la topología declarada

Confirmar que los exchanges y colas existen en RabbitMQ:

```bash
# Listar exchanges relevantes
docker exec rabbitmq rabbitmqctl list_exchanges | grep -E 'uct\.activos\.events|uct\.dlx'

# Listar colas relevantes
docker exec rabbitmq rabbitmqctl list_queues | grep -E 'notificaciones\.queue|auditoria\.queue|dead-letter\.queue'
```

Resultado esperado:
```
uct.activos.events   topic
uct.dlx              topic
notificaciones.queue 0
auditoria.queue      0
dead-letter.queue    0
```

### 3.3 Prueba de simulación de fallo y envío a DLQ

Este script simula un mensaje con payload inválido (faltan campos requeridos del `NotificacionEventoDto`), verifica que el consumidor falle 3 veces y que el mensaje termine en `dead-letter.queue`.

#### Paso A: Publicar un mensaje inválido al exchange

```bash
curl -s -u guest:guest -X POST http://127.0.0.1:15672/api/exchanges/%2F/uct.activos.events/publish \
  -H 'Content-Type: application/json' \
  -d '{
    "routing_key": "notificacion.envio",
    "payload": "{ \"tipo\": \"EMAIL\" }",
    "payload_encoding": "string",
    "headers": {},
    "properties": {}
  }'
```

Resultado esperado: `{"routed":true}`

#### Paso B: Esperar a que ocurran los 3 reintentos y el envío a DLQ

```bash
# Esperar ~15 segundos para que el consumidor procese los 3 reintentos
sleep 15
```

#### Paso C: Consultar la cola dead-letter.queue

```bash
curl -s -u guest:guest -X POST http://127.0.0.1:15672/api/queues/%2F/dead-letter.queue/get \
  -H 'Content-Type: application/json' \
  -d '{
    "count": 10,
    "ackmode": "ack_requeue_false",
    "encoding": "auto"
  }'
```

Resultado esperado (ejemplo):
```json
[
  {
    "payload_bytes": 19,
    "redelivered": false,
    "exchange": "uct.dlx",
    "routing_key": "dead-letter",
    "message_count": 0,
    "properties": {"delivery_mode": 2, "headers": {}},
    "payload": "{ \"tipo\": \"EMAIL\" }",
    "payload_encoding": "string"
  }
]
```

#### Paso D: Verificar que las colas de origen quedaron vacías

```bash
docker exec rabbitmq rabbitmqctl list_queues | grep -E 'notificaciones\.queue|auditoria\.queue|dead-letter\.queue'
```

Todas deben mostrar `0` mensajes.

### 3.4 Flujo esperado (criterio de aceptación #1)

| Intento | Estado | Acción del consumidor |
|---------|--------|----------------------|
| 1 | ❌ Fallo validación DTO | `handleFailure` → republica con `x-retry-count=1`, `ack` |
| 2 | ❌ Fallo validación DTO | `handleFailure` → republica con `x-retry-count=2`, `ack` |
| 3 | ❌ Fallo validación DTO | `handleFailure` → `retryCount+1 >= maxRetries` → `nack(msg, false, false)` |
| DLQ | ✅ Enrutado | RabbitMQ envía vía DLX `uct.dlx` con RK `dead-letter` → `dead-letter.queue` |

### 3.5 Logs esperados en `ms-notificaciones`

```
[RabbitmqTopologyService] Topología RabbitMQ declarada correctamente
[RabbitmqConsumerService] Consumidores RabbitMQ iniciados en: notificaciones.queue, auditoria.queue
[RABBITMQ] Fallo procesando mensaje en notificaciones.queue: NotificacionEventoDto inválido: ... Reintentos: 1/3
[RABBITMQ] Fallo procesando mensaje en notificaciones.queue: NotificacionEventoDto inválido: ... Reintentos: 2/3
[RABBITMQ] Fallo procesando mensaje en notificaciones.queue: NotificacionEventoDto inválido: ... Reintentos: 3/3
[RABBITMQ] Máximo de reintentos alcanzado. Enviando a DLQ (dead-letter.queue).
```

---

## 4. Criterios de Aceptación — Estado

| # | Criterio | Estado | Evidencia |
|---|----------|--------|-----------|
| 1 | Si un mensaje falla más de 3 veces consecutivas, se traslada automáticamente a la DLQ | ✅ Comprobado | Prueba funcional: mensaje inválido llegó a `dead-letter.queue` tras 3 reintentos |
| 2 | Los exchanges y colas se declaran y crean automáticamente durante el arranque | ✅ Comprobado | Logs: `Topología RabbitMQ declarada correctamente`; exchanges y colas visibles en `rabbitmqctl` |
| 3 | Contratos DTO sólidos y validados con `class-validator` | ✅ Comprobado | `NotificacionEventoDto` y `AuditoriaEventoDto` con decoradores `@IsEnum`, `@IsString`, `@IsNotEmpty`, `@ValidateNested`, `@Type`; validación real en el consumidor vía `plainToInstance` + `validate` |

---

## 5. Notas de Operación

- Las variables de entorno `RABBITMQ_MAX_RETRIES` y `RABBITMQ_MESSAGE_TTL` permiten ajustar el límite de reintentos y el TTL sin modificar código.
- La cola `dead-letter.queue` tiene `x-message-ttl=300000` (5 min); los mensajes no inspeccionados expiran automáticamente.
- Para re-procesar mensajes de la DLQ, consumir manualmente desde `dead-letter.queue` y republicar al exchange principal con la routing key original.
- No se suben cambios a GitHub según instrucciones del usuario.

