
## Descripción de la tarea  (Jira)
---
**Objetivo:** Eliminar cualquier secreto, contraseña o URL de base de datos del código fuente (hardcoded) para prevenir fugas de información.

**Descripción:** Revisar profundamente los repositorios/carpetas de ms-auth, ms-incidencias, ms-activos y api-gateway. Migrar cualquier string sensible a su respectivo `.env`. Configurar @nestjs/config en cada microservicio usando validación de esquema con Joi o class-validator para garantizar que la app no arranque si falta una variable de entorno en el servidor de producción.

- **Criterios de Aceptación:**
    1. Archivo `.env.example` creado en la raíz de cada microservicio.
    2. Fallo de arranque (Graceful Shutdown) si falta el `DATABASE_URL` o el `JWT_SECRET`.
    
- **Dependencias:** Ninguna.

## Conocimientos
---
#### Validación de esquemas de NestJS/Config y Joi
---
`Joi` es una herramienta que sirve para validar schemas: si una variable marcada como requerida no existe, la app lanzará una excepción y se detendrá en el arranque (<span style="color:red">Graceful Shutdown</span>)

[[TAL-129 Aislar variables de entorno críticas (.env)#^qdjwn9]]

#### Validación en la API sin Joi
---
Como la API Gateway no usa NestJS (no tiene archivo `main.ts`), la validación debe hacerse a nivel de Node.js antes de levantar el servidor, para ello se instala `dotenv` con un código como este:

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

const requiredEnvs = ['PORT', 'JWT_SECRET', 'MS_AUTH_URL'];
const missingEnvs = requiredEnvs.filter((env) => !process.env[env]);

if (missingEnvs.length > 0) {
  console.error(`🛑 FATAL ERROR: Faltan variables de entorno críticas: ${missingEnvs.join(', ')}`);
  process.exit(1); // Aborta el proceso inmediatamente
}

import Fastify from 'fastify';
const app = Fastify({ logger: true });

// ... resto de la configuración del gateway
```


## Commit
---
**ConfigService (Joi) en Auth e Incidencias** ^qdjwn9

- **Fixeos paralelos:** Eliminación de doble importación de AuthModule en el `app.module.ts` de MS Incidencias.
- Se cambiaron los `package.json` y `app.module.ts` de Auth e Incidencias para integrar el Joi.
- Cambio de `.env` para Auth e Incidencias: cambio de AuthPort por port para seguir estándar.
- Reconfiguracion de `main.ts` en Auth para usar `configService` que usa `Joi`.
- Reconfiguracion de `main.ts` en Incidencias para usar `configService` que usa `Joi`.

**Configuración del API Gateway con validación**

- Se cambió el `index.js` de API Gateway para generar la validación de las variables de entorno: **se acaba el hardcodeo de url** (puerto explícitamente expresados en el código) en los `fastify.register()` y en la constante `port` al final del archivo.
	- Se aprovechó de implementar el estándar de `rewritePrefix` que habíamos recomendado para las rutas de los microservicios en los `fasitify.register()`
- Redefinición del `.env.example` para cumplir con estándar de nombre de PORT y se agrega la URL del MS_AUTH que faltaba.