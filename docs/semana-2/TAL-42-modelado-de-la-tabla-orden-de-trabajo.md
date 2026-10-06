# TAL-42: Modelado de la tabla Orden de Trabajo

## 1. Diagnóstico previo

- El modelo `Incidencias` y `HistorialIncidencia` existen y se encuentran operativos en `ms-incidencias/prisma/schema.prisma` tras la integración de TAL-40 y TAL-41.
- El sistema cuenta con la definición de estados de incidencias (`Reportada`, `Asignada`, `Resuelta`).
- Faltaba la entidad relacional `OrdenTrabajo` encargada de formalizar la asignación de tareas de reparación a los técnicos de soporte.
- `ms-auth` mantiene la entidad `User` en una base de datos desacoplada (`auth_db` en puerto 5435), por lo que `tecnico_id` debe operar como una referencia lógica UUID, preservando la independencia de microservicios.

---

## 2. Resumen técnico

- `ms-incidencias/prisma/schema.prisma`:
  - Se define el enum Prisma `EstadoOrdenTrabajo` con los valores: `Pendiente`, `EnProceso`, `Completada`, `Cancelada`.
  - Se crea el modelo `OrdenTrabajo` con clave primaria UUID, relación foránea con `Incidencias` (con eliminación en cascada), campos de fechas (`fecha_asignacion`, `fecha_inicio`, `fecha_termino`) e instrucciones técnicas.
  - Se actualiza el modelo `Incidencias` añadiendo la relación inversa `ordenes_trabajo OrdenTrabajo[]`.
- `ms-incidencias/prisma/migrations/20260923210000_add_orden_trabajo/migration.sql`:
  - Crea el tipo `EstadoOrdenTrabajo` nativo en PostgreSQL.
  - Crea la tabla `"OrdenTrabajo"` con su primary key y default `Pendiente`.
  - Agrega índices de rendimiento por `incidencia_id` y `tecnico_id`.
  - Agrega la foreign key referenciando a `"Incidencias"("id_incidencia")` con `ON DELETE CASCADE ON UPDATE CASCADE`.
- `docs/TAL-42-modelado-de-la-tabla-orden-de-trabajo.md`: Documentación técnica de diseño, justificación y pruebas.

---

## 3. Modelo de datos

### Entidad: `OrdenTrabajo`

| Campo | Tipo | Restricción / Modificador | Descripción |
|---|---|---|---|
| `id_orden` | `String (UUID)` | `@id @default(uuid())` | Identificador único de la orden de trabajo. |
| `incidencia_id` | `String (UUID)` | `FK -> Incidencias(id_incidencia)` | Incidencia que originó la orden de trabajo. |
| `tecnico_id` | `String (UUID)` | `Indexed` | Identificador del técnico asignado (`ms-auth`). |
| `estado` | `EstadoOrdenTrabajo` | `DEFAULT 'Pendiente'` | Estado operativo de la tarea (`Pendiente`, `EnProceso`, `Completada`, `Cancelada`). |
| `instrucciones` | `String? (Text)` | `@db.Text, Nullable` | Detalle o instrucciones especiales para el técnico. |
| `fecha_asignacion` | `DateTime` | `DEFAULT now(), @db.Timestamp()` | Fecha y hora en que se asignó la orden. |
| `fecha_inicio` | `DateTime?` | `@db.Timestamp(), Nullable` | Fecha en que el técnico inició los trabajos. |
| `fecha_termino` | `DateTime?` | `@db.Timestamp(), Nullable` | Fecha en que se completó o canceló la orden. |

---

## 4. Decisiones arquitectónicas

### 4.1. Enum nativo en PostgreSQL
Se implementó `EstadoOrdenTrabajo` como enum nativo para garantizar que ningún proceso, script o cliente pueda insertar estados inválidos en la base de datos, tipando fuertemente el cliente generado por Prisma en TypeScript.

### 4.2. Índices para consultas de alto rendimiento
Se definieron dos índices explícitos:
- `@@index([incidencia_id])`: Permite recuperar instantáneamente las órdenes asociadas a una incidencia sin realizar un *sequential scan*.
- `@@index([tecnico_id])`: Optimiza las consultas del panel del técnico (ej. *"Mis órdenes de trabajo pendientes"*), mitigando la latencia en las vistas principales de la aplicación móvil y web.

### 4.3. Relación con `ms-auth` (Cross-Service Reference)
Siguiendo la arquitectura *Database-per-Service*, `tecnico_id` no utiliza una Foreign Key SQL física hacia la tabla `User` de `ms-auth`. La validación de existencia e integridad de los técnicos se realiza a nivel de API Gateway / Token JWT (evitando vulnerabilidades IDOR en los controladores posteriores).

---

## 5. Migración y Rollback

### Aplicación:
```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5434/incidencias_db?schema=public"
npx.cmd prisma migrate deploy
npx.cmd prisma generate
```

### Rollback manual (si fuera requerido):
```sql
DROP TABLE "OrdenTrabajo";
DROP TYPE "EstadoOrdenTrabajo";
```

---

## 6. Guía de Pruebas y Validación

### Validación estática:
```powershell
npx.cmd prisma validate
npx.cmd prisma generate
npm.cmd run build
npm.cmd run lint
```

### Ejemplo de inserción en Prisma:
```typescript
import { EstadoOrdenTrabajo, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const nuevaOrden = await prisma.ordenTrabajo.create({
  data: {
    incidencia_id: 'uuid-incidencia-existente',
    tecnico_id: 'uuid-tecnico-auth',
    estado: EstadoOrdenTrabajo.Pendiente,
    instrucciones: 'Revisar fuente de poder del proyector en Auditorio.',
  },
});
```

---

## 7. Resultado

- **TAL-42:** Completamente modelado en esquema Prisma y migración SQL.
- **Relaciones relacionales:** `Incidencias 1 <--> N OrdenTrabajo` con borrado en cascada.
- **Índices de optimización:** Incorporados para `incidencia_id` y `tecnico_id`.
- **Compatibilidad con TAL-43:** La base queda lista para construir el controlador REST transaccional de asignación de órdenes.
