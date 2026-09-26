# TAL-40: Definicion de estados de incidencias

## Diagnostico previo

- El modelo `Incidencias` existe en `ms-incidencias/prisma/schema.prisma`.
- Antes del cambio no tenia una columna `estado` ni un enum asociado.
- `npm.cmd run build` paso correctamente.
- Las pruebas unitarias existentes pasaron: 1 suite y 1 prueba.
- El lint no reporto errores.
- `prisma validate` no pudo ejecutarse inicialmente porque faltaba `DATABASE_URL`; con la variable configurada, el esquema paso la validacion.
- La base PostgreSQL local no estaba disponible en `localhost:5434`, por lo que la migracion no pudo aplicarse ni probarse contra una base real.

## Implementacion

Se agrego el enum Prisma `EstadoIncidencia` con los valores exactos:

- `Reportada`
- `Asignada`
- `Resuelta`

El modelo `Incidencias` ahora tiene `estado EstadoIncidencia @default(Reportada)`. El valor por defecto permite migrar registros existentes sin dejar la nueva columna obligatoria en estado nulo.

La migracion `20260922170000_add_estado_incidencia` crea el enum nativo de PostgreSQL y agrega la columna con una restriccion de tipo real en la base de datos.

Prisma generara `EstadoIncidencia` en `@prisma/client`, evitando que las capas TypeScript usen cadenas de estado sin tipado.

## Archivos modificados o creados

- `ms-incidencias/prisma/schema.prisma`: define el enum y lo relaciona con `Incidencias`.
- `ms-incidencias/prisma/migrations/20260922170000_add_estado_incidencia/migration.sql`: crea el enum PostgreSQL y la columna `estado`.
- `docs/TAL-40-definicion-estados-incidencias.md`: documenta la implementacion, decisiones y validacion.

## Flujo

1. La capa de aplicacion construye una entrada de `Incidencias` usando el tipo generado `EstadoIncidencia`.
2. Prisma serializa el valor y ejecuta el `INSERT` o `UPDATE`.
3. PostgreSQL valida que `estado` pertenezca a `Reportada`, `Asignada` o `Resuelta`.
4. Un valor diferente es rechazado por la base de datos, incluso si otro consumidor evita la validacion de la API.

El microservicio actual no tiene todavia un endpoint de creacion o actualizacion de incidencias; por eso la integracion de DTO/controlador queda para la tarea que implemente esas operaciones.

## Decision arquitectonica

Se eligio un enum nativo de PostgreSQL representado por un enum Prisma.

### Motivos

- La integridad queda protegida en el limite mas fuerte: la base de datos.
- Todos los consumidores, no solo este microservicio, reciben la misma restriccion.
- Prisma expone un tipo TypeScript generado y reduce el uso de magic strings.
- La validacion es directa y no depende de que cada controlador recuerde validar el estado.

### Alternativas consideradas

**`CHECK` constraint:** ofrece mayor flexibilidad para cambiar la expresion y suele ser mas portable, pero puede quedar desincronizado del enum del ORM y requiere mantener manualmente la validacion equivalente.

**Validacion exclusiva en la aplicacion con DTO/Zod/Joi:** es sencilla y entrega errores amigables antes de llegar a la base, pero no protege escrituras directas, scripts, otros servicios ni futuras rutas que olviden aplicar el pipe. Por eso debe complementar la restriccion de base, no reemplazarla.

**Tabla catalogo de estados:** permite metadatos, orden y activacion/desactivacion de estados, pero agrega joins, claves foraneas y complejidad innecesaria para los tres estados fijos de TAL-40.

El enum es adecuado mientras el conjunto sea pequeno y estable. Si el negocio necesita estados configurables o metadatos, la evolucion recomendada seria una tabla catalogo mediante una version de contrato planificada.

## Migracion y rollback

Aplicar:

```powershell
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5434/incidencias_db?schema=public'
npx.cmd prisma migrate deploy
npx.cmd prisma generate
```

La migracion conserva los registros existentes y asigna `Reportada` a las filas actuales. Para revertir manualmente en una ventana controlada:

```sql
ALTER TABLE "Incidencias" DROP COLUMN "estado";
DROP TYPE "EstadoIncidencia";
```

No se debe ejecutar el rollback si ya existen dependencias sobre la columna.

## Guia de pruebas

Validacion estatica y compilacion:

```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run build
npm.cmd run lint
npm.cmd test -- --runInBand
```

Prueba valida con Prisma una vez disponible PostgreSQL:

```ts
import { EstadoIncidencia, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
await prisma.incidencias.create({
  data: {
    id_activo: 'activo-1',
    id_reportante: 'usuario-1',
    titulo: 'Falla de red',
    descripcion: 'Sin conectividad',
    estado: EstadoIncidencia.Reportada,
  },
});
```

Un estado invalido no debe compilar:

```ts
estado: 'Cancelada';
```

Y una escritura directa invalida debe fallar en PostgreSQL:

```sql
UPDATE "Incidencias"
SET "estado" = 'Cancelada'
WHERE "id_incidencia" = '...';
```

## Resultado

- TAL-40: implementada en esquema y migracion.
- Modelo `Incidencias`: presente.
- Restriccion en base de datos: definida mediante enum PostgreSQL.
- Modelo TypeScript tipado: definido mediante enum Prisma generado.
- Migracion: creada.
- Compilacion y pruebas existentes: aprobadas.
- Aplicacion contra PostgreSQL: pendiente porque el servidor `localhost:5434` no estaba disponible.
