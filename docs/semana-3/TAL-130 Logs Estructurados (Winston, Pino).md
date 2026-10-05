
#nestjs #nodejs #logger
## Descripción de la tarea  (Jira)
---
**Objetivo:** Facilitar la trazabilidad de errores cuando la aplicación esté en producción sin mirar la consola en vivo.

**Descripción:** Reemplazar el Logger por defecto de NestJS en el API Gateway y el ms-incidencias. Instalar nest-winston (o nestjs-pino). Configurar los transportes para que:

- Nivel `INFO`: Se pinte en consola.
- Nivel `ERROR`: Se guarde en un archivo diario local `logs/error-%DATE%.log` (usando `winston-daily-rotate-file`)
        
- **Criterios de Aceptación:**
    1. Los errores de validación de endpoints quedan registrados en el archivo `.log`.
    2. Los logs contienen timestamps precisos y el stacktrace del error.
        
- **Dependencias:** Ninguna.

## Comentarios
---
El <span style="color:rgb(240, 116, 0)"><b>Logger</b></span> por defecto de NestJS imprime los mensajes informativos al inicializar los proyectos (`pnpm start:dev`), pero su problema principal es que es efímero y no deja un registro permanente al cerrarse la consola.

Tanto <span style="color:rgb(240, 116, 0)"><b>Winston</b></span> como <span style="color:rgb(240, 116, 0)"><b>Pino</b></span> son librerías externas que permiten generar logs estructurados y persistentes: usaremos Winston ya que la tarea pide el uso explícito de la librería `winston-daily-rotate-file`, además de que Winston facilita la separación de INFO y ERROR de forma nativa, mientras que Pino requiere configuraciones adicionales, ya que en principio escupe todo a *stdout*: si bien Pino es más rápido, sería sobreingeniería implementarlo en este proyecto de alcance limitado.

Los mensajes tipo <span style="color:rgb(240, 116, 0);font-style:italic;font-weight:bold">INFO</span> describen el flujo normal y exitoso. Los mensajes tipo <span style="color:rgb(240, 116, 0);font-style:italic;font-weight:bold">ERROR</span> registran fallos <span style="color:rgb(158, 158, 158)">(payloads incorrectos a los endpoints, caídas de BDs, excepciones no controladas)</span>

Tiene sentido implementar Winston en <span style="color:rgb(240, 116, 0)">API Gateway</span> y en <span style="color:rgb(240, 116, 0)">MS Incidencias</span>, ya que el API Gateway es la puerta de acceso general, y MS Incidencias puede ser el más propenso a errores: MS Auth es un servicio muy lineal con poca diversidad potencial de errores, y el Frontend se ejecuta en navegador así que no puede escribir un *.log* en el servidor.

Para implementarlo en la <span style="color:rgb(240, 116, 0)">MS Incidencias</span>,  se reemplaza el Logger por defecto de NestJS: se instala la librería adaptadora `nest-winston`, se configura en el `app.module.ts` y en `main.ts`, y se le indica a NestJS que apague el Logger nativo y envíe los logs al txt local mediante Winston.

Para implementarlo en la <span style="color:rgb(240, 116, 0)">API Gateway</span>, **que no usa NestJS**, se instala Winston nativo y se configura para usarlo de forma nativa con Node.js, integrándolo con la instancia de Fastify (Fastify tiene una propiedad `logger` en su configuración, a la que en vez de darle un *true*, le damos la instancia de Winston), o en este caso:

```typescript
// Antes
const fastify = Fastify({ logger: options.logger ?? true });
// Después
const fastify = Fastify({ logger: logger });
```

## Commit
---

**Configuraciones en API Gateway**
- Se instala Winston en API Gateway (`package.json`).
- Se crea `logger.js` en el mismo directorio que `index.js`, se configuró para guardar los errores de las últimas 2 semanas, un periodo razonable.
- Importación del `logger.js` en `index.js` y cambio del logger predeterminado por nuestra instancia de Winston en la definición de la constante `fastify` dentro de `buildGateway`.

**Configuraciones en MS Incidencias**
- Se instala Winston en MS Incidencias (`package.json`).
- Se importa el  módulo Winston en los imports de `app.module.ts`: se centraliza su configuración ahí a diferencia de lo hecho en la API.
- Se cambia `main.ts` para no usar el logger por defecto:
	- Se apaga el logger temporalmente durante el arranque en la constante `app`.
	- Se le indica a NestJS que use la configuración de Winston que creamos en app.module (`app.useLogger`)
	- Se reemplaza el *console.log* final por nuestro logger al final para reportar que MS incidencias empezó a correr.