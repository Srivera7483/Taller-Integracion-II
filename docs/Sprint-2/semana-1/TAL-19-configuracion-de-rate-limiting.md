# TAL-19: Configuración de Rate Limiting en API Gateway

## 1. Identificación y Diagnóstico Previo

- **ID del Requerimiento:** TAL-19
- **Nombre:** Configuración de Rate Limiting
- **Módulo / Servicio:** `api gateway`
- **Rol Responsable:** Miembro 2 – Especialista en Lógica de Negocio e Integración
- **Ubicación de Documentación:** `docs/Sprint-2/semana-1/`

### 1.1. Justificación de Seguridad y Rendimiento
El API Gateway es el punto único de entrada (*Single Point of Entry*) para todas las aplicaciones clientes (Frontend Web y Aplicación Móvil) hacia los microservicios del sistema (`ms-auth`, `ms-incidencias`, `ms-activos`).

Sin una política de limitación de tasa de peticiones (*Rate Limiting*), el sistema se encontraba expuesto a:
1. **Ataques de Denegación de Servicio (DoS / DDoS)** que podrían saturar las conexiones y agotar los recursos de CPU/memoria de los microservicios.
2. **Ataques de Fuerza Bruta** en rutas sensibles de autenticación (`/api/v1/auth/login`).
3. **Consumo Desmedido y Abusivo de APIs** por clientes con bucles infinitos o peticiones descontroladas.

---

## 2. Resumen de Archivos Modificados y Creados

| Archivo | Tipo de Cambio | Propósito |
|---|---|---|
| `api gateway/package.json` | Modificado | Integración de la dependencia `@fastify/rate-limit` (v10+ compatible con Fastify 5). |
| `api gateway/src/config/rate-limit.config.js` | Creado | Módulo de configuración con cálculo dinámico de límites, variables de entorno, exclusiones y respuesta personalizada. |
| `api gateway/src/config/rate-limit.config.ts` | Creado | Definición de tipos e interfaces TypeScript para el Rate Limiter. |
| `api gateway/index.js` | Modificado | Registro global de `@fastify/rate-limit` y exposición de `/health`. |
| `api gateway/index.test.js` | Modificado | Pruebas automáticas para validación de límites, rechazo con código 429 y excepciones en lista blanca. |
| `docs/Sprint-2/semana-1/TAL-19-configuracion-de-rate-limiting.md` | Creado | Documentación técnica exhaustiva del requerimiento TAL-19. |

---

## 3. Especificación Técnica y Parámetros

### 3.1. Variables de Entorno Configurables

| Variable | Tipo | Default | Descripción |
|---|---|---|---|
| `RATE_LIMIT_MAX` | `Number` | `100` | Cantidad máxima de solicitudes permitidas por cliente en la ventana de tiempo. |
| `RATE_LIMIT_WINDOW` | `String` / `Number` | `'1 minute'` | Duración de la ventana de tiempo deslizante (ej: `'1 minute'`, `60000`). |

### 3.2. Headers HTTP Inyectados en Cada Respuesta

El API Gateway añade automáticamente las siguientes cabeceras estándar para que los clientes frontend conozcan su cuota disponible:

| Cabecera | Descripción |
|---|---|
| `x-ratelimit-limit` | Límite máximo de solicitudes asignado al cliente. |
| `x-ratelimit-remaining` | Cantidad de solicitudes restantes antes de ser bloqueado. |
| `x-ratelimit-reset` | Tiempo restante (en segundos) para el reinicio de la ventana. |
| `retry-after` | Segundos que debe esperar el cliente antes de reintentar (solo en código 429). |

---

## 4. Ejemplo de Respuesta JSON ante Bloqueo (`429 Too Many Requests`)

Cuando un cliente sobrepasa el número máximo de peticiones dentro de la ventana de tiempo, el Gateway intercepta la solicitud y responde inmediatamente:

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Has excedido el límite de solicitudes permitidas. Por favor, intenta de nuevo más tarde.",
  "max": 100,
  "timeWindow": "1 minute",
  "date": "2026-10-06T19:50:00.000Z"
}
```

---

## 5. Decisiones Arquitectónicas y de Seguridad

### 5.1. Protección Temprana en el Perímetro (*Fail-Fast*)
La limitación de tasa se ejecuta en el API Gateway **antes de iniciar cualquier túnel proxy hacia los microservicios**. Esto evita el consumo innecesario de sockets de red, memoria y procesamiento en `ms-auth`, `ms-incidencias` y `ms-activos`.

### 5.2. Lista Blanca (*Allow List*) para Endpoints Críticos
Los endpoints de verificación de salud (`/` y `/health`) se encuentran excluidos del Rate Limiting mediante la función `allowList`, permitiendo que los balanceadores de carga (*Load Balancers*) y monitores de infraestructura puedan realizar chequeos continuos (*heartbeats*) sin riesgo de ser bloqueados.

### 5.3. Identificación Fiable del Cliente
El plugin `@fastify/rate-limit` rastrea a los clientes utilizando la dirección IP de origen (`req.ip`), garantizando aislamiento entre distintos usuarios conectados desde redes externas.

---

## 6. Guía de Pruebas y Validación

### 6.1. Ejecutar las Pruebas Automatizadas:
```powershell
cd "api gateway"
npm test
```

### 6.2. Ejemplo de Prueba con cURL:
```bash
# Realizar peticiones consecutivas para verificar el decremento de x-ratelimit-remaining:
curl -i http://localhost:3000/api/v1/activos
```

---

## 7. Conclusiones y Estado del Requerimiento

- **Ticket TAL-19:** ✅ **Completado al 100%**.
- **Perímetro Blindado:** Protección contra DoS y fuerza bruta operativa en el API Gateway.
- **Configurabilidad:** Límites parametrizables mediante variables de entorno sin recompilar.
- **Calidad:** Pruebas automáticas integradas y aprobadas.
