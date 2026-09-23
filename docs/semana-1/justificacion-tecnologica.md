# Registro de Decisión Arquitectónica (ADR)
## Selección del Stack Tecnológico Backend (MS Autenticación)

**Fecha:** 22 de Septiembre de 2026  
**Autor:** Benjamín Soto (`bsoto2025`)  
**Estado:** 🟢 Aprobado e Implementado  
**Tarjetas Relacionadas:** TAL-22, TAL-23, TAL-28 

---

## 1. Contexto y Problema

Para el desarrollo del **Taller de Integración II** (Sistema de Gestión de Incidencias y Activos), se requería definir una base tecnológica robusta para el backend. El sistema está proyectado para funcionar mediante una arquitectura de **microservicios** (Autenticación, Incidencias, Activos).

El desafío principal era seleccionar tecnologías que permitieran:
1. Alta escalabilidad y bajo acoplamiento.
2. Un desarrollo rápido pero con **estricta seguridad de tipos** para evitar errores en tiempo de ejecución.
3. Alto rendimiento y manejo seguro de la autenticación.

Si bien las tecnologías fueron heredadas en primera instancia de conocimientos y plantillas previas del equipo, es necesario justificar técnicamente **por qué** este stack es el óptimo para resolver el problema de dominio planteado.

---

## 2. Decisiones y Solución Adoptada (El "Por Qué")

El stack seleccionado para el Microservicio de Autenticación (y extendido al resto del ecosistema backend) se compone de: **NestJS, Fastify, Prisma ORM, PostgreSQL y Argon2 + JWT**.

### 2.1. Framework Principal: NestJS
* **Decisión:** Utilizar NestJS en lugar de Express.js puro.
* **Justificación Técnica:** NestJS impone una arquitectura altamente opinada (basada en Módulos, Controladores y Servicios) que aplica patrones de diseño empresariales como la **Inyección de Dependencias (DI)** nativa. Dado que el proyecto escalará a múltiples microservicios, mantener un código estructurado y predecible es vital. Con Express puro, el código tiende a desorganizarse rápidamente ("spaghetti code"), mientras que NestJS fomenta la mantenibilidad a largo plazo.

### 2.2. Adaptador HTTP: Fastify (en vez de Express)
* **Decisión:** Reemplazar el motor HTTP por defecto de NestJS (Express) por `@nestjs/platform-fastify`.
* **Justificación Técnica:** Fastify es capaz de procesar hasta un **30% más de peticiones por segundo** en comparación con Express gracias a su arquitectura optimizada. Dado que el `ms-auth` será consultado constantemente por los demás microservicios (o el API Gateway) para validar tokens en cada petición, la latencia debe ser mínima.

### 2.3. Acceso a Datos: Prisma ORM
* **Decisión:** Utilizar Prisma en lugar de TypeORM o Sequelize.
* **Justificación Técnica:** Prisma ofrece **tipado estricto de extremo a extremo**. A diferencia de TypeORM, que requiere sincronizar clases TypeScript con las tablas y puede ser propenso a errores silenciosos (como los vistos en el bypass de tipos corregido recientemente), Prisma genera un cliente a medida basado en el `schema.prisma`. Esto nos asegura que cualquier cambio en la BD arrojará un error de compilación inmediato si el código backend queda desactualizado, mejorando drásticamente la Experiencia de Desarrollo (DX).

### 2.4. Base de Datos: PostgreSQL
* **Decisión:** Motor relacional PostgreSQL.
* **Justificación Técnica:** El dominio del problema (Usuarios, Roles, Órdenes de Trabajo, Incidencias, Activos) es altamente relacional. PostgreSQL garantiza **integridad referencial (ACID)**. Además, nos permite flexibilidad futura si necesitamos guardar metadatos no estructurados gracias a su soporte nativo de campos `JSONB`.

### 2.5. Seguridad: Argon2 y JWT
* **Decisión:** Hashing de contraseñas con `argon2` y autenticación Stateless con JWT.
* **Justificación Técnica:** 
  * **Argon2** es el ganador del *Password Hashing Competition* y es el estándar criptográfico moderno recomendado por OWASP frente a algoritmos antiguos como bcrypt, ya que es resistente a ataques por fuerza bruta utilizando GPUs (ataques de canal lateral).
  * **JWT (JSON Web Tokens):** Se seleccionó un enfoque *stateless* (sin estado). Esto permite que, si el microservicio de Autenticación se cae, el API Gateway u otros microservicios puedan seguir validando si un token es real simplemente verificando su firma criptográfica, sin tener que consultar a la base de datos constantemente.

---

## 3. Alternativas Consideradas

* **Express.js Puro (Backend):** Descartado porque requiere configurar manualmente el enrutador, validadores, interceptores y middlewares. Habríamos perdido la estandarización que nos dio NestJS (como el *AllExceptionsFilter* global - TAL-34).
* **MongoDB (NoSQL):** Descartado. La estructura del sistema de gestión de infraestructura requiere uniones (JOINs) constantes entre Incidencias, Usuarios y Activos. Usar NoSQL habría complicado mantener la consistencia de los datos.
* **Bcrypt:** Descartado en favor de Argon2 por recomendaciones de seguridad actualizadas.

---

## 4. Consecuencias (Trade-offs)

**Ventajas:**
* **Seguridad y Confianza:** TypeScript + Prisma evitan que el servidor crashee en producción por errores de tipado.
* **Velocidad de red:** Fastify nos otorga margen de sobra para escalar el microservicio de autenticación sin colapsar bajo carga.
* **Arquitectura Limpia:** Facilita la división del trabajo (se notó al dividir tareas con los compañeros).

**Desventajas (Deuda Técnica / Retos):**
* **Curva de Aprendizaje:** NestJS y Prisma requieren comprender conceptos avanzados (Decoradores, Providers, Generación de Clientes) que en Express.js no existen.
* **Incompatibilidad inicial:** Fastify requiere usar tipos específicos (como `FastifyRequest`), lo que causó conflictos temporales al mezclarlo con dependencias de Express (corregido en saneamiento de la semana 1).

---

## 5. Referencias al Código (Implementación)

* Inicialización de Fastify: [`ms-auth/src/main.ts`](../../ms-auth/src/main.ts)
* Integración de Prisma: [`ms-auth/src/prisma/prisma.service.ts`](../../ms-auth/src/prisma/prisma.service.ts)
* Implementación de Argon2: [`ms-auth/src/auth/auth.service.ts`](../../ms-auth/src/auth/auth.service.ts)
