# Análisis Objetivo: Contrato OpenAPI (TI4) vs Proyecto Actual (TI2)

Tras analizar exhaustivamente el contrato propuesto por Taller de Integración IV (`openapi.yaml`) y el reporte de evaluación (`evaluación_de_contrato_api.md`), presento una visión objetiva sobre qué deberíamos ceder (adaptar de ellos) y qué deberíamos defender (mantener de lo nuestro).

---

## ✅ 1. Lo que SÍ debemos adaptar del Contrato (Es mejor práctica)

El contrato propone ciertas cosas que son estándares de la industria y que mejorarán la calidad de nuestro backend:

*   **Versionamiento en Rutas (`/api/v1/...`):** 
    Actualmente nuestro código expone las rutas en la raíz (`/auth`). El contrato exige `api/v1/auth`. **Adoptaremos esto**. Es una excelente práctica de diseño de APIs (Versionamiento URL) para evitar romper apps móviles si en el futuro hacemos un `/api/v2/`.
*   **Claims JWT Estándar (`sub`):**
    El contrato exige que el token JWT guarde la ID del usuario bajo la llave `sub` en lugar de `userId`. Esto es correcto, ya que `sub` (Subject) es el estándar oficial (RFC 7519) para JWT. **Adoptaremos esto**.
*   **Respuesta enriquecida en el Login:**
    Actualmente devolvemos solo `{"accessToken": "..."}`. El contrato pide que devolvamos el Token + los datos del Usuario. **Adoptaremos esto**. Le ahorra a la app móvil (y a nuestro propio Frontend web) hacer una segunda llamada a `/auth/me` para saber quién se logueó.

---

## ⚖️ 2. Lo que podemos "Negociar" (Soluciones intermedias)

El contrato impone un fuerte uso del español en el transporte de datos (Spanglish), lo cual choca con las convenciones internacionales de código que solemos usar (inglés).

*   **Variables `correo` vs `email`, `rol` vs `role`:**
    El contrato exige que el JSON que reciba y envíe el backend use claves en español (`correo`, `id_usuario`). Para no reescribir toda nuestra base de datos ni cambiar el nombre de nuestras variables internas, **sugiero una adaptación superficial**: 
    Mantendremos el código y la base de datos en inglés/estándar, pero usaremos decoradores y mapeadores (ej. en NestJS `@Expose({ name: 'correo' })`) para que al salir por la API, el JSON se "traduzca" a lo que 4° año espera.

---

## 🛡️ 3. Lo que debemos DEFENDER y NO seguir al pie de la letra

Hay un punto crítico donde el contrato propuesto por 4° año es **técnicamente inferior y peligroso** para un entorno de producción, y debemos mantener nuestra implementación de la Semana 1.

*   **La estructura de Errores (JSON):**
    > [!WARNING]
    > El contrato de 4° año exige que **todos** los errores respondan únicamente esto:
    > ```json
    > { "mensaje": "Texto del error" }
    > ```

    **Por qué es una mala idea:** Esa estructura es pobrísima. No incluye un código de estado (statusCode), no incluye el momento en que ocurrió (timestamp), ni la ruta que falló (path). Eso hará que debuguear problemas en producción sea una pesadilla para nosotros (TI2).
    
    **La solución (Nuestra contrapropuesta):**
    En la semana 1 (`TAL-35`) implementamos un filtro global de errores predecible muy completo. Para no romper la aplicación móvil de TI4 pero tampoco perder nuestra trazabilidad, modificaremos nuestro filtro para que **incluya ambas cosas**. 
    Devolveremos:
    ```json
    {
      "statusCode": 400,
      "mensaje": "Texto del error",
      "message": "Texto del error",
      "timestamp": "2026-09-23T12:00:00Z",
      "path": "/api/v1/auth/login"
    }
    ```
    Así, la app de 4° año buscará su llave `"mensaje"` y le funcionará perfecto, y nosotros conservaremos toda la metadata para monitoreo.

---

## Conclusión Estratégica

**No es necesario seguirlo ciegamente al pie de la letra, pero sí debemos cumplir su interfaz pública.** 
Podemos implementar las modificaciones requeridas de forma inteligente sin destruir el trabajo de estandarización que ya hicimos en nuestro núcleo. 

Si te parece bien esta postura, el siguiente paso sería crear un **Implementation Plan** para refactorizar `ms-auth` y su filtro de excepciones, de modo que cumpla el contrato de 4° año pero con nuestras condiciones de seguridad (punto 3).
