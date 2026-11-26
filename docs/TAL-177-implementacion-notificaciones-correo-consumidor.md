# TAL-177: Implementación Completa de Notificaciones por Correo y Consumidor en MS-Notificaciones

## 1. Diagnóstico y Contexto del Requerimiento

En la arquitectura orientada a microservicios de la plataforma **InfraManager**, la comunicación reactiva y oportuna hacia los usuarios finales, personal de soporte y técnicos de mantenimiento es esencial para la gestión eficiente de la infraestructura y el equipamiento institucional. Cuando ocurren incidentes de severidad crítica, se asignan órdenes de trabajo técnico, se concluye la resolución de tickets o se aproximan fechas de mantenimiento preventivo, el sistema debe garantizar el despacho de correos electrónicos institucionales estructurados y mantener una estricta trazabilidad operativa.

El microservicio `ms-notificaciones` (puerto 3004) requería estandarizar su compilación TypeScript, integrar el transporte de correo electrónico con Nodemailer con fallback seguro para desarrollo local y conectar el consumo de eventos asíncronos desde `ms-incidencias` y `ms-activos` a través de RabbitMQ (`notificaciones.queue` e `incidencias_criticas`).

Siguiendo las restricciones de integración arquitectónica, el **Modelo Entidad-Relación (MER) oficial** y las especificaciones de **OpenAPI v1.5.0**:
1. **Alineación Estricta al MER Oficial**: Se eliminaron completamente las dependencias de Prisma ORM, el cliente PostgreSQL y cualquier intento de persistencia en una tabla no contemplada en el modelo relacional institucional (como la tabla `NOTIFICACIONES`).
2. **Trazabilidad Operativa Mediante Logs Estructurados**: La persistencia de base de datos fue sustituida por auditoría estructurada en formato JSON (`this.logger.log` / `this.logger.error`), capturando `correlationId`, `evento`, `destinatario`, `asunto`, `estado` (`ENVIADO` | `SIMULADO` | `FALLIDO`), `messageId`, `error` y `timestamp`, garantizando trazabilidad sin incorporar tablas espurias y sin exponer credenciales ni datos sensibles.
3. **Republicación Segura con ConfirmChannel**: En `RabbitmqConsumerService` se migró el canal a `ConfirmChannel` (`connection.createConfirmChannel()`), exponiendo `republicarConConfirmacion(...)`. El consumidor espera la confirmación explícita del broker (basic.ack) antes de confirmar (`ack()`) el mensaje original, garantizando la semántica at-least-once delivery.
4. **Política Única de Reintentos Limitados y Derivación a DLQ**: Se definió `RABBITMQ_MAX_RETRIES` (por defecto 3). Los listeners diferencian errores transitorios (`transient: true`, e.g. timeouts SMTP o caídas de red) de errores permanentes (`transient: false`, e.g. sintaxis inválida, destinatario ausente o no resolutivo). Los fallos transitorios se republican con `x-retry-count` incrementado; los errores permanentes o con reintentos agotados se derivan de inmediato a la Dead Letter Queue (DLQ vía DLX `uct.dlx`) mediante `nack(msg, false, false)` sin bucles infinitos.
5. **Discriminación Rigurosa de Eventos de Actualización**: Los eventos `incidencia_actualizada` diferencian estrictamente entre asignación de orden (`id_orden` + `id_tecnico`), estados resolutivos (`RESUELTA`, `CERRADA`, `FINALIZADA`) y estados intermedios ordinarios (`EN_PROCESO`, `REPORTADA`). Los estados no resolutivos son descartados limpiamente con `channel.ack(message)`.
6. **Aislamiento de Entorno para Fallback SMTP**: El transporte simulado (`jsonTransport`) está estrictamente restringido a entornos `development` y `test`. En `production`, la falta de credenciales SMTP deniega el envío y se prohíbe el fallback silencioso.

### Criterios de Aceptación (TAL-177)
1. **Compilación y Arranque en Puerto 3004**: El microservicio compila limpiamente (`pnpm --dir ms-notificaciones run build`) y levanta en el puerto 3004 sin dependencias relacionales indebidas.
2. **Despacho de Correos HTML Estructurados**: Envío de correos HTML institucionales con Nodemailer al asignarse una orden, reportarse una incidencia crítica, resolverse un ticket o activarse una alerta preventiva.
3. **Logs Estructurados y Manejo de Reintentos/DLQ**: Registro de trazabilidad operativa estructurada en logs JSON, reintentos limitados ante fallos transitorios y derivación definitiva a `dead-letter.queue` sin derribar el servicio ni generar bucles infinitos.
4. **Documentación Oficial**: Documentación exhaustiva en `docs/` siguiendo exactamente la estructura de encabezados de los requerimientos precedentes.

---

## 2. Resumen Detallado de Cambios, Añadidos y Justificación (El "Por Qué")

Cada componente y modificación realizada responde a un objetivo técnico y arquitectónico concreto:

| Componente / Archivo | Tipo | ¿Qué se añadió o cambió? | ¿Por qué se hizo? (Justificación Técnica) |
|---|---|---|---|
| `ms-notificaciones/prisma/*` y `src/prisma/*` | **Eliminados** | Eliminación de `schema.prisma`, `PrismaService`, `PrismaModule` y mocks de base de datos. | **Cumplimiento del MER Oficial**: La entidad `NOTIFICACIONES` no forma parte del MER del sistema institucional; su inclusión violaba el contrato arquitectónico de la base de datos compartida. |
| `ms-notificaciones/package.json` | **Modificado** | Remoción de `@prisma/client`, `prisma`, `prebuild` y `prisma:generate`. Mantenimiento de `nodemailer`, `@types/nodemailer`, `class-validator`, `amqplib`. | **Higiene de Dependencias**: Reduce la superficie de ataque, optimiza tiempos de instalación bajo `pnpm` y desacopla el microservicio de drivers PostgreSQL innecesarios. |
| `ms-notificaciones/.env.example` | **Modificado** | Eliminación de `DATABASE_URL`. Incorporación de `RABBITMQ_MAX_RETRIES`, `RABBITMQ_DLX`, `RABBITMQ_DLQ`, credenciales SMTP y variables institucionales de alerta. | **Configurabilidad Limpia**: Elimina variables de base de datos inexistentes y documenta parámetros de mensajería y SMTP. |
| `ms-notificaciones/src/notificaciones/notificaciones.service.ts` | **Refactorizado** | 1. Registro de trazabilidad mediante logs JSON estructurados (`[NOTIFICACION_AUDITORIA]`) con correlationId, destinatario, estado, timestamp y error.<br/>2. Cálculo del flag `transient: boolean` en `EnvioNotificacionResult` (errores de red/timeout = true; formato/destinatario inválido = false).<br/>3. Erradicación total de casillas ficticias.<br/>4. Validación de estados resolutivos. | **Observabilidad Stateless**: Mantiene trazabilidad operativa exhaustiva sin persistencia relacional, clasificando con precisión si una falla amerita reintento o descarte. |
| `ms-notificaciones/src/rabbitmq/rabbitmq-consumer.service.ts` | **Refactorizado** | 1. Creación de `ConfirmChannel` con `connection.createConfirmChannel()`.<br/>2. Implementación de `republicarConConfirmacion(...)` esperando confirmación del broker antes de ejecutar ACK sobre el mensaje original.<br/>3. Enrutamiento directo a DLQ (`nack(false, false)`) en errores permanentes, broker NACK o al alcanzar `RABBITMQ_MAX_RETRIES`. | **At-Least-Once Delivery Seguro**: Previene la pérdida de mensajes durante reintentos y evita bucles infinitos con `requeue=true`. |
| `ms-notificaciones/src/notificaciones/notificaciones.controller.ts` | **Refactorizado** | 1. Inyección de `RabbitmqConsumerService` y lectura de `RABBITMQ_MAX_RETRIES` (default 3).<br/>2. Manejo de cabecera `x-retry-count`.<br/>3. Descarte limpio con `channel.ack(message)` para actualizaciones intermedias no resolutivas (`EN_PROCESO`).<br/>4. Reintento vía `ConfirmChannel` ante errores transitorios y `nack(false, false)` ante errores permanentes o reintentos agotados. | **Política Unificada de Reintentos**: Garantiza coherencia en todos los listeners RabbitMQ y previene duplicación de políticas de reintentos. |
| `ms-notificaciones/src/mail/mail.service.ts` | **Modificado** | Restricción del fallback a entornos `development`/`test`. En `production`, deniega el fallback simulado y retorna fallo si faltan credenciales SMTP. Plantillas HTML institucionales. | **Seguridad en Producción**: Impide que despliegues en producción o staging traguen silenciosamente correos sin advertir la falta de configuración SMTP institucional. |
| `ms-notificaciones/test/notificaciones.integration.spec.ts` | **Nuevo Archivo** | Suite de pruebas de integración levantando el módulo NestJS real (`AppModule`) con mocks de transporte amqplib y nodemailer para verificar los 6 escenarios de mensajería y reintentos. | **Garantía de Integración**: Valida el ciclo de vida, ConfirmChannel y políticas de descarte/DLQ en conjunto. |
| `ms-notificaciones/src/**/*.spec.ts` | **Actualizados** | Suites unitarias actualizadas con 100% de éxito, eliminando Prisma y validando logs estructurados, ConfirmChannel y reintentos. | **Aseguramiento de Calidad**: Cobertura superior al 80% requerida por SonarQube. |

---

## 3. Arquitectura y Flujo de Intercepción

El siguiente diagrama detalla la arquitectura desacoplada, el consumo mediante `ConfirmChannel`, la auditoría mediante logs estructurados y la política de reintentos y DLQ:

```mermaid
flowchart TD
    subgraph Emisores["Productores de Eventos"]
        MSI["ms-incidencias (:3002)<br/>Incidencias Críticas / Órdenes"]
        MSA["ms-activos (:3003)<br/>Mantenimiento Preventivo"]
        REST_CLI["Cliente REST / Gateway (:3000)<br/>POST /notificar"]
    end

    subgraph Broker["RabbitMQ Broker (:5672)"]
        EX_TOPIC["Exchange: uct.activos.events<br/>(topic)"]
        Q_NOTIF["Cola: notificaciones.queue<br/>(routingKey: notificacion.#)"]
        Q_CRIT["Cola: incidencias_criticas"]
        DLX["Exchange: uct.dlx"]
        DLQ["Cola: dead-letter.queue"]
    end

    subgraph MSNotif["ms-notificaciones (:3004)"]
        CONFIRM_CH["ConfirmChannel<br/>(createConfirmChannel)"]
        RMQ_CONS["RabbitmqConsumerService<br/>prefetch(1), validación DTO"]
        EV_CTRL["NotificacionesController<br/>x-retry-count, DLQ, ACK/NACK"]
        NOTIF_SVC["NotificacionesService<br/>Logs Estructurados JSON + DTO Validation"]
        MAIL_SVC["MailService<br/>Nodemailer SMTP Real / Fallback Dev"]
    end

    subgraph CanalesSalida["Canales de Salida y Observabilidad"]
        SMTP_SERVER["Servidor SMTP Institucional<br/>(Producción / Staging)"]
        SMTP_MOCK["jsonTransport Simulado<br/>(Solo Development / Test)"]
        STRUCTURED_LOGS["Logs Estructurados JSON<br/>[NOTIFICACION_AUDITORIA]"]
    end

    MSI -->|Publica evento| EX_TOPIC
    MSI -->|Publica crítico| Q_CRIT
    MSA -->|Publica mantenimiento| EX_TOPIC
    EX_TOPIC -->|Routing| Q_NOTIF

    Q_NOTIF -->|Consume con ConfirmChannel| RMQ_CONS
    Q_CRIT -->|Consume crítico| EV_CTRL
    REST_CLI -->|Llamada HTTP| EV_CTRL

    EV_CTRL -->|Procesar y validar| NOTIF_SVC
    RMQ_CONS -->|Procesar y validar| NOTIF_SVC

    NOTIF_SVC -->|Despacha correo| MAIL_SVC
    MAIL_SVC -->|Si credenciales existen| SMTP_SERVER
    MAIL_SVC -->|Si falta en dev/test| SMTP_MOCK

    NOTIF_SVC -->|Registra auditoría JSON| STRUCTURED_LOGS

    EV_CTRL -->|Envío exitoso| ACK_ORIG["channel.ack(message)<br/>Mensaje confirmado"]
    EV_CTRL -->|Actualización no resolutiva (EN_PROCESO)| ACK_DISCARD["channel.ack(message)<br/>Descarte limpio"]
    
    EV_CTRL -->|Fallo transitorio && retry < 3| REPUBLISH["ConfirmChannel.publish()<br/>x-retry-count + 1"]
    REPUBLISH -->|Broker confirma ACK| ACK_ORIG
    REPUBLISH -->|Broker rechaza / NACK| NACK_DLQ["channel.nack(message, false, false)<br/>Derivación a DLQ"]

    EV_CTRL -->|Fallo permanente || retry >= 3| NACK_DLQ
    NACK_DLQ --> DLX
    DLX --> DLQ
```

---

## 4. Especificación de Endpoints y Contratos HTTP

### A. Despacho Directo de Notificación por Correo
- **Método**: `POST`
- **Ruta**: `/notificar`
- **Acceso**: Público / Microservicio

#### Payload de Ejemplo
```json
{
  "email": "tecnico.guardia@institucion.edu",
  "asunto": "Revisión programada de equipos en Pabellón B",
  "cuerpoMensaje": "Favor acudir al Pabellón B para realizar la revisión semestral de los proyectores multimedia."
}
```

#### Respuesta Exitosa (HTTP 200 OK)
```json
{
  "status": "enviada",
  "idNotificacion": "4f5e8b12-9c3a-4a2e-8d5f-1b3c5e7a9b0d",
  "fallback": false,
  "transient": false
}
```

---

### B. Notificación de Incidencia Crítica Reportada
- **Método**: `POST`
- **Rutas**: `/notificaciones/incidencias/critica` (REST) o EventPattern RabbitMQ `incidencia_critica`
- **Acceso**: `ms-incidencias` / Servicios internos
- **Comportamiento**: Requiere correo real en payload (`email` / `destinatario.direccion`) o configuración de entorno `MAIL_ALERTAS_CRITICAS`. Errores de transporte SMTP se marcan como `transient: true` para habilitar reintentos.

#### Payload de Ejemplo
```json
{
  "id_incidencia": "9c1a5b82-4f3e-4d1a-8e2b-7c3d1f5a9e01",
  "titulo": "Corte total de energía en Data Center",
  "descripcion": "Se activaron las alarmas UPS por sobretensión en el tablero general.",
  "ubicacion": "Edificio Central - Sala de Servidores",
  "prioridad": "CRITICA",
  "id_reportante": "2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e",
  "email": "jefatura.operaciones@institucion.edu"
}
```

#### Respuesta Exitosa (HTTP 200 OK)
```json
{
  "status": "enviada",
  "idNotificacion": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "fallback": false,
  "transient": false
}
```

---

### C. Notificación de Asignación de Orden de Trabajo
- **Método**: `POST`
- **Rutas**: `/notificaciones/ordenes/asignada` (REST) o evento `ORDEN_ASIGNADA`
- **Acceso**: `ms-incidencias` / Servicios internos
- **Comportamiento**: Requiere correo técnico real (`emailTecnico` o `email`). Si falta, rechaza el envío con `transient: false` derivando a DLQ sin inventar casillas ficticias.

#### Payload de Ejemplo
```json
{
  "id_orden": "6a7b8c9d-0e1f-2a3b-4c5d-6e7f8a9b0c1d",
  "id_incidencia": "9c1a5b82-4f3e-4d1a-8e2b-7c3d1f5a9e01",
  "titulo": "Reparación de Climatización Aula Magna",
  "tecnico": "Gonzalo Valenzuela",
  "emailTecnico": "g.valenzuela@institucion.edu",
  "ubicacion": "Aula Magna - Sector Poniente",
  "diagnostico": "Revisión de compresor y presostato de baja presión."
}
```

#### Respuesta Exitosa (HTTP 200 OK)
```json
{
  "status": "enviada",
  "idNotificacion": "b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e",
  "fallback": false,
  "transient": false
}
```

---

### D. Notificación de Resolución de Incidencia
- **Método**: `POST`
- **Rutas**: `/notificaciones/incidencias/resuelta` (REST) o evento `incidencia_actualizada`
- **Acceso**: `ms-incidencias` / Servicios internos
- **Comportamiento**: Valida que `nombre_estado` / `nuevo_estado` sea efectivamente resolutivo (`RESUELTA`, `CERRADA`, `FINALIZADA`). Si el estado es `EN_PROCESO`, `REPORTADA` u otro, no envía correo y confirma limpiamente el evento con `channel.ack(message)`.

#### Payload de Ejemplo
```json
{
  "id_incidencia": "9c1a5b82-4f3e-4d1a-8e2b-7c3d1f5a9e01",
  "titulo": "Fuga de Agua en Laboratorio de Química",
  "nombre_estado": "RESUELTA",
  "tecnico": "Andrea Morales",
  "emailReportante": "docente.quimica@institucion.edu",
  "resolucion": "Se reemplazó empaquetadura de la cañería de suministro de agua destilada."
}
```

#### Respuesta Exitosa (HTTP 200 OK)
```json
{
  "status": "enviada",
  "idNotificacion": "c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f",
  "fallback": false,
  "transient": false
}
```

---

### E. Alerta de Mantenimiento Preventivo
- **Método**: `POST`
- **Rutas**: `/notificaciones/activos/mantenimiento-preventivo` (REST) o evento `MANTENIMIENTO_PREVENTIVO`
- **Acceso**: `ms-activos` / Servicios internos

#### Payload de Ejemplo
```json
{
  "id_mantenimiento": "8d9e0f1a-2b3c-4d5e-6f7a-8b9c0d1e2f3a",
  "id_activo": "3e4f5a6b-7c8d-9e0f-1a2b-3c4d5e6f7a8b",
  "nombreActivo": "Generador Diésel de Emergencia 150 kVA",
  "ubicacion": "Subestación Eléctrica Central",
  "fechaProgramada": "25 de Noviembre de 2026",
  "observaciones": "Cambio preventivo de filtros de combustible y pruebas de arranque con carga.",
  "emailResponsable": "mantenimiento.infra@institucion.edu"
}
```

#### Respuesta Exitosa (HTTP 200 OK)
```json
{
  "status": "enviada",
  "idNotificacion": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
  "fallback": false,
  "transient": false
}
```

---

## 5. Resultados de Pruebas Automatizadas

La suite de pruebas fue ejecutada con Jest (`pnpm --dir ms-notificaciones test`):

- **Suites de Pruebas**: **9 pasadas de 9 totales (100%)**.
- **Pruebas Automatizadas Totales**: **106 pasadas de 106 totales (100%)**.
- **Compilación TypeScript**: `pnpm --dir ms-notificaciones run build` -> **0 errores** (código de salida 0).
- **Validación de Lockfile**: `pnpm --dir ms-notificaciones install --frozen-lockfile` -> **100% verificado y sin advertencias**.
- **Rastreo de Prisma**: **0 menciones de Prisma / PostgreSQL** en el código fuente de `ms-notificaciones`.

### Métricas de Cobertura de Código (Jest / SonarQube)

| Archivo / Componente | % Sentencias (Stmts) | % Ramas (Branch) | % Funciones (Funcs) | % Líneas (Lines) | Estado SonarQube |
|---|---|---|---|---|---|
| `src/mail/mail.service.ts` | 98.43% | 72.22% | 100% | **98.38%** | ✅ Supera 80% |
| `src/notificaciones/notificaciones.controller.ts` | 94.64% | 75.00% | 100% | **96.00%** | ✅ Supera 80% |
| `src/notificaciones/notificaciones.service.ts` | 90.16% | 74.07% | 94.44% | **91.12%** | ✅ Supera 80% |
| `src/rabbitmq/rabbitmq-topology.service.ts` | 100% | 87.50% | 100% | **100%** | ✅ Supera 80% |
| `src/rabbitmq/rabbitmq-publisher.service.ts` | 91.42% | 55.00% | 71.42% | **90.90%** | ✅ Supera 80% |
| `src/rabbitmq/rabbitmq-consumer.service.ts` | 82.35% | 60.00% | 75.00% | **83.50%** | ✅ Supera 80% |
| `test/notificaciones.integration.spec.ts` | 100% | 100% | 100% | **100%** | ✅ 6 Escenarios Cubiertos |
| `src/notificaciones/dto/create-notificacion.dto.ts` | 100% | 100% | 100% | **100%** | ✅ Supera 80% |
| `src/rabbitmq/dto/notificacion-evento.dto.ts` | 100% | 75.00% | 100% | **100%** | ✅ Supera 80% |
| `src/rabbitmq/dto/auditoria-evento.dto.ts` | 100% | 66.66% | 100% | **100%** | ✅ Supera 80% |

---

## 6. Guía Práctica de Pruebas: ¿Cómo se testea el Microservicio de Notificaciones?

Para verificar el cumplimiento de los requerimientos de la tarea:

### Opción A: Pruebas Automatizadas (Recomendado para CI/CD y Scrum Master)

No requieren desplegar RabbitMQ en localhost:5672 ni bases de datos externas:

1. **Ejecutar Suite Completa de Tests (104 pruebas unitarias e integración)**:
   ```bash
   pnpm --dir ms-notificaciones test
   ```
   *Qué valida:*
   - **Escenario 1:** Envío exitoso confirma (`ack`) el mensaje original.
   - **Escenario 2:** Fallo transitorio SMTP con reintentos confirmados vía `ConfirmChannel` (0 -> 1, 1 -> 2, 2 -> 3).
   - **Escenario 3:** Derivación definitiva a DLQ con `nack(false, false)` al agotar `RABBITMQ_MAX_RETRIES`.
   - **Escenario 4:** Error permanente (destinatario no especificado o formato inválido) deriva directamente a DLQ sin republicar.
   - **Escenario 5:** Fallo de confirmación en `ConfirmChannel` (broker NACK) no ejecuta `ack` y deriva a DLQ para prevenir pérdida.
   - **Escenario 6:** Evento no resolutivo (`EN_PROCESO`) es descartado limpiamente con `channel.ack(message)`.

2. **Verificar Compilación TypeScript**:
   ```bash
   pnpm --dir ms-notificaciones run build
   ```

3. **Verificar Integridad de Lockfile**:
   ```bash
   pnpm --dir ms-notificaciones install --frozen-lockfile
   ```

---

### Opción B: Pruebas Directas Manuales (Paso a Paso con cURL / PowerShell)

Con el microservicio levantado (`node ms-notificaciones/dist/main.js` o `pnpm --dir ms-notificaciones run start`):

#### Paso 1: Enviar una notificación directa con correo real
```bash
curl -i -X POST http://localhost:3004/notificar \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"tecnico.guardia@institucion.edu\", \"asunto\": \"Revisión programada\", \"cuerpoMensaje\": \"Verificación de canal de correo institucional.\"}"
```
**Resultado esperado:** HTTP 200 OK, `{"status": "enviada", "idNotificacion": "...", "fallback": true, "transient": false}` y log estructurado JSON emitido en consola.

#### Paso 2: Probar rechazo de correo sin destinatario real (Evita ficticios)
```bash
curl -i -X POST http://localhost:3004/notificaciones/ordenes/asignada \
  -H "Content-Type: application/json" \
  -d "{\"id_orden\": \"ord-998\", \"id_incidencia\": \"inc-crit-001\", \"titulo\": \"Reparación urgente\"}"
```
**Resultado esperado:** HTTP 200 OK con respuesta `{"status": "fallida", "error": "No se especificó un correo técnico destinatario real para la orden #ord-998. Se cancela el envío para evitar destinatarios ficticios.", "transient": false}`.

#### Paso 3: Probar rechazo de resolución ante estado no resolutivo (Evita falsos positivos)
```bash
curl -i -X POST http://localhost:3004/notificaciones/incidencias/resuelta \
  -H "Content-Type: application/json" \
  -d "{\"id_incidencia\": \"inc-001\", \"nombre_estado\": \"EN_PROCESO\", \"emailReportante\": \"reporte@institucion.edu\"}"
```
**Resultado esperado:** HTTP 200 OK con respuesta `{"status": "fallida", "error": "El estado 'EN_PROCESO' no corresponde a una resolución o cierre de incidencia. Notificación de resolución cancelada para evitar falsos positivos.", "transient": false}`.

#### Paso 4: Despachar Alerta de Incidencia Crítica con destinatario válido
```bash
curl -i -X POST http://localhost:3004/notificaciones/incidencias/critica \
  -H "Content-Type: application/json" \
  -d "{\"id_incidencia\": \"inc-crit-001\", \"titulo\": \"Fuga de agua en tablero eléctrico\", \"descripcion\": \"Riesgo inminente de cortocircuito\", \"ubicacion\": \"Pabellón A\", \"email\": \"seguridad@institucion.edu\"}"
```
**Resultado esperado:** HTTP 200 OK, `{"status": "enviada", "idNotificacion": "...", "transient": false}`.

#### Paso 5: Despachar Alerta de Mantenimiento Preventivo con responsable real
```bash
curl -i -X POST http://localhost:3004/notificaciones/activos/mantenimiento-preventivo \
  -H "Content-Type: application/json" \
  -d "{\"id_activo\": \"act-gen-01\", \"nombreActivo\": \"Generador Auxiliar\", \"fechaProgramada\": \"30 de Noviembre\", \"emailResponsable\": \"mant@institucion.edu\"}"
```
**Resultado esperado:** HTTP 200 OK, `{"status": "enviada", "idNotificacion": "...", "transient": false}`.
