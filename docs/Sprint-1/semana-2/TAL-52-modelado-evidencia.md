# TAL-52: Modelado de la entidad Evidencia

## 1. Diagnostico previo

- La entidad `Incidencias` existe en `ms-incidencias/prisma/schema.prisma`.
- La tabla `Incidencias` depende de migraciones previas del microservicio.
- Las migraciones base fueron aplicadas en PostgreSQL `incidencias_db`.
- La compilacion de `ms-incidencias` fue validada correctamente.
- La conexion a PostgreSQL fue comprobada mediante Prisma en `localhost:5434`.

Diagnostico: el prerrequisito de TAL-52 esta presente y el entorno quedo estable para agregar la relacion con evidencias.

## 2. Resumen tecnico

- `ms-incidencias/prisma/schema.prisma`: agrega el modelo `Evidencia` y la relacion inversa en `Incidencias`.
- `ms-incidencias/prisma/migrations/20260923221950_add_evidencia/migration.sql`: crea la tabla, el indice y la llave foranea.
- `ms-incidencias/scripts/validate-evidencia.cjs`: valida columnas, llave foranea y borrado en cascada.
- `ms-incidencias/src/app.module.ts`: repara el modulo principal para incluir Prisma e incidencias.
- `ms-incidencias/src/prisma/prisma.module.ts`: elimina declaraciones duplicadas del modulo Prisma.
- `ms-incidencias/src/prisma/prisma.service.ts`: elimina la implementacion duplicada del servicio Prisma.

## 3. Modelo de datos

El modelo implementado es:

```prisma
model Evidencia {
  id_evidencia  String      @id @default(uuid())
  incidencia_id String
  descripcion   String      @db.Text
  fecha         DateTime    @default(now()) @db.Timestamp()

  incidencia Incidencias @relation(fields: [incidencia_id], references: [id_incidencia], onDelete: Cascade)

  @@index([incidencia_id])
}
```

Campos y restricciones:

- `id_evidencia`: identificador tecnico UUID.
- `incidencia_id`: llave foranea obligatoria hacia `Incidencias.id_incidencia`.
- `descripcion`: texto libre para describir la evidencia.
- `fecha`: fecha de registro generada automaticamente.
- `@@index([incidencia_id])`: acelera la consulta de evidencias por incidencia.
- `onDelete: Cascade`: elimina las evidencias cuando se elimina su incidencia propietaria.

La relacion es 1:N: una incidencia puede tener cero, una o muchas evidencias, mientras que cada evidencia pertenece a una sola incidencia.

## 4. Decision arquitectonica

Se eligio una tabla separada porque la evidencia es una coleccion potencialmente creciente y tiene identidad, fecha y relacion propia. La llave foranea deja la integridad referencial bajo control de PostgreSQL, incluso cuando la escritura no proviene de la API.

### Ventajas frente a JSON o JSONB en `Incidencias`

- Permite una llave foranea real y evita evidencias huerfanas.
- Permite indexar directamente `incidencia_id`, `fecha` o futuras propiedades.
- Facilita paginacion, conteo, ordenamiento y consultas por evidencia.
- Permite agregar restricciones, auditoria y permisos independientes.
- Escala mejor cuando una incidencia acumula muchas evidencias.

### Costos frente a JSON o JSONB

- Requiere un `JOIN` o una consulta adicional para recuperar evidencias.
- Agrega una tabla, una migracion y una relacion que mantener.
- Las transacciones que escriben incidencia y evidencia deben coordinar ambas entidades.

JSON/JSONB puede ser conveniente para datos pequenos, variables y sin necesidad de integridad referencial. Sin embargo, incrustar la evidencia dentro de `Incidencias` dificulta las consultas parciales, la indexacion de cada registro, la paginacion y el crecimiento independiente de la coleccion. Para este dominio, el modelo relacional separado es mas consistente y escalable.

## 5. Migracion

La migracion generada es `20260923221950_add_evidencia` y crea:

1. La tabla `Evidencia`.
2. El indice `Evidencia_incidencia_id_idx`.
3. La FK `Evidencia_incidencia_id_fkey` hacia `Incidencias`.
4. La regla `ON DELETE CASCADE`.

Aplicar migraciones desde `ms-incidencias`:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5434/incidencias_db"
.\node_modules\.bin\prisma.cmd migrate deploy
```

La migracion fue ejecutada exitosamente en la base local `incidencias_db` y Prisma confirmo que el esquema esta actualizado.

## 6. Guia de validacion

Validacion del esquema y compilacion:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5434/incidencias_db"
.\node_modules\.bin\prisma.cmd validate
.\node_modules\.bin\nest.cmd build
npm.cmd test -- --runInBand
```

Validacion funcional de columnas, FK y cascada:

```powershell
node .\scripts\validate-evidencia.cjs
```

El script verifica que:

- Existan `id_evidencia`, `incidencia_id`, `descripcion` y `fecha`.
- `incidencia_id` referencie `Incidencias.id_incidencia`.
- Una evidencia con una incidencia inexistente sea rechazada con el error Prisma `P2003`.
- Al eliminar una incidencia, sus evidencias sean eliminadas automaticamente.

Consulta SQL equivalente para inspeccionar la tabla:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Evidencia'
ORDER BY ordinal_position;
```

Consulta SQL para revisar la llave foranea:

```sql
SELECT
  kcu.column_name,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'Evidencia';
```

## 7. Resultado

- TAL-52: implementada.
- Modelo `Evidencia`: creado.
- Columnas de descripcion, fecha y llave foranea: creadas.
- Relacion 1:N con `Incidencias`: implementada.
- Integridad referencial: validada.
- Eliminacion en cascada: validada.
- Migracion SQL: generada y aplicada.
- Documentacion tecnica: disponible en este archivo.