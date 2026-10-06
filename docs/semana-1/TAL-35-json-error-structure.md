# Technical Note: TAL-35
## Estructura JSON Estándar para Errores REST

**Fecha:** 22 de Septiembre de 2026  
**Autor:** Benjamín Soto (`bsoto2025`)  
**Estado:** 🟢 Completado  
**Épica/Semana:** Semana 1  

---

## 1. Contexto y Requerimientos

La tarjeta **[TAL-35]** funciona como una extensión de la **[TAL-34]**. Una vez que logramos interceptar los errores, nos enfrentamos a un problema de interoperabilidad con el equipo de **Frontend**: NestJS no siempre devuelve los errores con la misma estructura.

Por ejemplo:
1. Un error forzado manual: `throw new BadRequestException('Error simple')` devuelve un string.
2. Un error de validación de formulario (generado por `class-validator`): Devuelve un objeto donde la propiedad `message` es un *Array de strings*.
3. Un error interno del servidor (`InternalServerError`): Devuelve un objeto diferente.

El requerimiento principal era **garantizar un Contrato de API (API Contract) férreo** para que el equipo Frontend siempre supiera qué estructura leer al interceptar respuestas HTTP con estatus `4xx` y `5xx`.

---

## 2. Decisiones de Implementación y Diseño

### 2.1. Normalización del Formato de Respuesta
* **Decisión:** Se definió un esquema único que todos los errores deben cumplir estrictamente, sin importar su origen.
  ```json
  {
    "statusCode": 400,
    "timestamp": "2026-09-22T14:30:16.000Z",
    "path": "/auth/login",
    "message": ["El email debe ser válido"]
  }
  ```
* **Justificación Técnica:** Los campos `timestamp` y `path` (ruta original que falló) son vitales para la depuración y auditoría de seguridad. Permiten trazar cuándo falló un endpoint sin necesidad de que el frontend lo calcule. Además, previene que el equipo Frontend tenga que programar sentencias condicionales (ej. `if (typeof err === 'string') ... else if (Array.isArray(err)) ...`) cada vez que consumen un endpoint.

### 2.2. Aplanamiento del Mensaje a Array (Array Forcing)
* **Decisión:** Se acordó forzar el campo `message` para que **siempre sea un Array** (`string[]`), incluso si solo hay un único error.
* **Justificación Técnica:** Durante las reuniones técnicas, surgió la duda sobre cómo lidiar con los errores de `class-validator` (que valida DTOs y arroja múltiples errores si un formulario tiene varios campos malos). Si obligábamos al `message` a ser siempre un array, el frontend podía simplemente iterar (`map`) sobre la respuesta y pintar los errores directamente en los componentes `Toast` (TAL-50) o en el formulario, asumiendo que cada elemento del array es un error legítimo que mostrarle al usuario.

---

## 3. Consecuencias (Trade-offs)

**Ventajas logradas:**
* **Developer Experience (DX) del Frontend:** Facilita enormemente la implementación de HTTP Interceptors (como Axios) del lado del cliente web, acelerando el desarrollo de Axel y Eduardo.
* **Previsibilidad:** Independientemente del microservicio (Auth, Incidencias, Activos), todos responderán bajo el mismo esquema JSON si implementan este mismo filtro global.

**Limitaciones:**
* Las excepciones complejas que no son listas de errores legibles para humanos tienen que ser cuidadosamente transformadas a mensajes cortos y amigables antes de meterlas en el array `message`.

---

## 4. Referencias al Código

* Interceptor modificado para mapear la nueva estructura: [`ms-auth/src/common/filters/all-exceptions.filter.ts`](../../ms-auth/src/common/filters/all-exceptions.filter.ts)
