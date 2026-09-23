# Technical Note: TAL-34
## Interceptor de Captura de Errores No Controlados

**Fecha:** 22 de Septiembre de 2026  
**Autor:** Benjamín Soto (`bsoto2025`)  
**Estado:** 🟢 Completado  
**Épica/Semana:** Semana 1  

---

## 1. Contexto y Requerimientos

La tarjeta **[TAL-34]** nació de la necesidad de estandarizar la forma en que el backend responde cuando algo sale mal. En aplicaciones Node.js (incluyendo NestJS), cuando se arroja un error no esperado (por ejemplo, una base de datos caída o una variable no definida), el comportamiento por defecto suele ser uno de los siguientes:
1. El servidor "crashea" y detiene su ejecución.
2. El servidor retorna un error HTML genérico o un `HTTP 500 Internal Server Error` acompañado del *Stack Trace* (la pila de llamadas del código).

Ambos escenarios eran inaceptables. Se requería:
1. Asegurar que la aplicación nunca se apague por una excepción no capturada.
2. Evitar la fuga de información sensible (Information Disclosure) hacia el cliente web o app móvil.
3. Centralizar el manejo de errores para no ensuciar cada controlador con docenas de bloques `try-catch`.

---

## 2. Decisiones de Implementación y Diseño

Para abordar el problema, se decidió aprovechar los patrones de diseño orientados a aspectos (AOP) que ofrece el framework.

### 2.1. Implementación de un `ExceptionFilter` Global
* **Decisión:** Se creó la clase `AllExceptionsFilter` implementando la interfaz nativa `ExceptionFilter` de NestJS, y se inyectó a nivel de aplicación en el `main.ts`.
* **Justificación Técnica:** En lugar de interceptar errores en cada capa del servicio, un filtro de excepciones global actúa como una "malla de seguridad" final. Se sitúa en la capa más externa del servidor HTTP (Fastify/Express). Cualquier excepción arrojada —ya sea una advertencia de negocio (`HttpException` de código 400) o un error catastrófico no controlado (`TypeError` de código 500)—, es interceptada aquí antes de ser enviada al cliente.

### 2.2. Seguridad por Obscuridad Controlada (Information Disclosure Prevention)
* **Decisión:** El interceptor fue programado para evaluar el tipo de error. Si el error proviene de una regla de negocio programada por nosotros (`instanceof HttpException`), el filtro respeta el mensaje. Pero si es un error interno (`Error` nativo), el filtro sobrescribe el mensaje con un genérico *"Internal server error"*.
* **Justificación Técnica:** Los errores nativos a menudo contienen consultas SQL crudas, rutas absolutas del servidor o nombres de variables. Exponer esto a través de la red es una vulnerabilidad crítica según OWASP (A05:2021 Security Misconfiguration). El interceptor aísla la falla, la loguea en la consola para los desarrolladores, y envía un mensaje inocuo al frontend.

---

## 3. Consecuencias (Trade-offs)

**Ventajas logradas:**
* **Desacoplamiento:** Los controladores (ej. `auth.controller.ts`) quedaron extremadamente limpios. Ya no es necesario envolver todas las funciones en `try-catch`; los desarrolladores pueden simplemente hacer `throw new BadRequestException('...')` asumiendo que el filtro atrapará la excepción y la formateará.
* **Seguridad:** El frontend y los posibles atacantes externos nunca verán un error interno del motor de base de datos de Prisma.

**Limitaciones:**
* **Pérdida de granularidad inicial:** Al centralizar todo, si ocurre un error complejo 500, el frontend recibe un mensaje genérico. La única forma de depurarlo es accediendo a los logs del servidor local o la terminal de Docker, lo cual exige que los desarrolladores backend estén revisando activamente los registros.

---

## 4. Referencias al Código

* Implementación de la lógica del filtro: [`ms-auth/src/common/filters/all-exceptions.filter.ts`](../../ms-auth/src/common/filters/all-exceptions.filter.ts)
* Inyección global en el ciclo de vida del servidor: [`ms-auth/src/main.ts`](../../ms-auth/src/main.ts)
