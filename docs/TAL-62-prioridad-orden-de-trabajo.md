# TAL-62: Actualización de BD y Endpoints para "Prioridad" en Órdenes de Trabajo

## 1. Diagnóstico Previo

- La entidad `OrdenTrabajo` formaliza la asignación de tareas a los técnicos a partir de incidencias reportadas.
- En las especificaciones del sistema (`Contexto-Funcionamiento.txt` y modelado relacional), el Supervisor tiene la responsabilidad operativa de clasificar y priorizar la demanda de soporte según niveles de criticidad y SLA.
- La tabla de órdenes de trabajo (`ORDENES_TRABAJO` / `OrdenTrabajo`) carecía del campo de prioridad para registrar el grado de urgencia o criticidad asignado.
- El controlador de creación y asignación de órdenes de trabajo (`OrdenesTrabajoController` y `OrdenesTrabajoService`) no aceptaba ni persistía este parámetro.
- En la interfaz de usuario (`frontend-web`), el formulario de asignación no disponía de un control visual para seleccionar la prioridad, y el cliente consume la funcionalidad de forma abierta y global.

---

## 2. Resumen Técnico de Cambios

### 2.1. Base de Datos y Modelado Prisma (`ms-incidencias`)
- **`ms-incidencias/prisma/schema.prisma`**:
  - Definición del enum `Prioridad` con los valores `Alta`, `Media` y `Baja`.
  - Definición del enum `EstadoOrdenTrabajo` (`Pendiente`, `EnProceso`, `Completada`, `Cancelada`).
  - Incorporación del campo `prioridad Prioridad @default(Media)` en el modelo `OrdenTrabajo`.
  - Relación bidireccional consistente entre `Incidencias` y `OrdenTrabajo`.
- **`ms-incidencias/prisma/migrations/20260926220000_add_prioridad_ordenes_trabajo/migration.sql`**:
  - Creación del tipo enum `"Prioridad"` en PostgreSQL (`'Alta'`, `'Media'`, `'Baja'`).
  - Sentencia `ALTER TABLE "OrdenTrabajo" ADD COLUMN "prioridad" "Prioridad" NOT NULL DEFAULT 'Media';`.
  - Bloque condicional PL/pgSQL para compatibilidad directa con identificadores alternativos (`ORDENES_TRABAJO`).

### 2.2. Capa Backend NestJS (`ms-incidencias`)
- **`src/ordenes-trabajo/dto/asignar-orden.dto.ts`**:
  - Parámetro opcional `prioridad?: 'Alta' | 'Media' | 'Baja' | string`.
  - Soporte opcional para `supervisor_id?: string`.
- **`src/ordenes-trabajo/ordenes-trabajo.service.ts`**:
  - Función de normalización `normalizarPrioridad(prioridad)`: insensible a mayúsculas/minúsculas (`alta` -> `Alta`, `media` -> `Media`, `baja` -> `Baja`), asignando `Media` por defecto.
  - Validación estricta que rechaza valores inválidos con `BadRequestException`.
  - Guardado transaccional en `transaction.ordenTrabajo.create({ data: { ..., prioridad } })`.
- **`src/ordenes-trabajo/ordenes-trabajo.controller.ts`**:
  - Endpoint `@Post('asignar')` y alias `@Post()` para creación directa de órdenes.
  - Resolución resiliente del identificador de supervisor (`request.user`, `body.supervisor_id`, `x-user-id`, o fallback UUID) garantizando compatibilidad con el frontend de asignación abierta.
- **`src/ordenes-trabajo/ordenes-trabajo.service.spec.ts`**:
  - Pruebas unitarias que verifican:
    1. Guardado de prioridad por defecto (`Media`) si no se envía en el DTO.
    2. Guardado explícito de prioridad `Alta`.
    3. Normalización y guardado de prioridad en minúsculas (`baja` -> `Baja`).
    4. Rechazo con `BadRequestException` ante prioridades inválidas.

### 2.3. Capa Frontend (`frontend-web`)
- **`src/services/ordenesService.js`**:
  - Función `crearOrdenTrabajoApi` actualizada para aceptar e inyectar `prioridad` en el payload JSON hacia el API Gateway.
- **`src/views/AsignarTecnico.jsx`**:
  - Estado reactivo `const [prioridad, setPrioridad] = useState('Media')`.
  - Selector interactivo con opciones visuales (`Alta`, `Media`, `Baja`) con códigos de color e indicadores descriptivos.
  - Inclusión de `prioridad` en el payload de envío asíncrono y en la simulación 201 Created.
  - Limpieza del selector a valor por defecto (`Media`) tras emisión exitosa.
  - Visualización del badge de prioridad en el banner superior `#banner-orden-emitida` y en la nómina lateral `#seccion-ordenes-emitidas`.

---

## 3. Modelo de Datos y Migración SQL

### 3.1. Esquema Prisma (`schema.prisma`)
```prisma
enum Prioridad {
  Alta
  Media
  Baja
}

model OrdenTrabajo {
  id_orden            String             @id @default(uuid())
  incidencia_id       String
  tecnico_id          String
  estado              EstadoOrdenTrabajo @default(Pendiente)
  prioridad           Prioridad          @default(Media)
  instrucciones       String?            @db.Text
  diagnostico_tecnico String?            @db.Text
  fecha_asignacion    DateTime           @default(now()) @db.Timestamp()
  fecha_inicio        DateTime?          @db.Timestamp()
  fecha_termino       DateTime?          @db.Timestamp()

  incidencia          Incidencias        @relation(fields: [incidencia_id], references: [id_incidencia], onDelete: Cascade)

  @@index([incidencia_id])
  @@index([tecnico_id])
}
```

### 3.2. Script SQL de Migración (`migration.sql`)
```sql
-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('Alta', 'Media', 'Baja');

-- AlterTable
ALTER TABLE "OrdenTrabajo" ADD COLUMN "prioridad" "Prioridad" NOT NULL DEFAULT 'Media';
ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "diagnostico_tecnico" TEXT;

-- Compatibilidad para identificador ORDENES_TRABAJO
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ORDENES_TRABAJO') THEN
        ALTER TABLE "ORDENES_TRABAJO" ADD COLUMN IF NOT EXISTS "prioridad" "Prioridad" NOT NULL DEFAULT 'Media';
        ALTER TABLE "ORDENES_TRABAJO" ADD COLUMN IF NOT EXISTS "diagnostico_tecnico" TEXT;
    END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ordenes_trabajo') THEN
        ALTER TABLE "ordenes_trabajo" ADD COLUMN IF NOT EXISTS "prioridad" "Prioridad" NOT NULL DEFAULT 'Media';
        ALTER TABLE "ordenes_trabajo" ADD COLUMN IF NOT EXISTS "diagnostico_tecnico" TEXT;
    END IF;
END $$;
```

---

## 4. Endpoints y Payload

### `POST /ordenes-trabajo/asignar` (o `POST /ordenes-trabajo`)
- **Headers:** `Content-Type: application/json`
- **Body:**
```json
{
  "incidencia_id": "0df0c521-b4ec-4f81-a6ce-234b41989012",
  "tecnico_id": "2ba37a1c-ec54-4a41-b847-fbe7552aa001",
  "prioridad": "Alta",
  "instrucciones": "Revisar transformador de energía principal con urgencia."
}
```
- **Respuesta (`201 Created`):**
```json
{
  "id_orden": "7f8b9a12-1234-4567-89ab-cdef01234567",
  "incidencia_id": "0df0c521-b4ec-4f81-a6ce-234b41989012",
  "tecnico_id": "2ba37a1c-ec54-4a41-b847-fbe7552aa001",
  "estado": "Pendiente",
  "prioridad": "Alta",
  "instrucciones": "Revisar transformador de energía principal con urgencia.",
  "fecha_asignacion": "2026-09-26T22:00:00.000Z",
  "fecha_inicio": null,
  "fecha_termino": null
}
```
