-- Add state and evidence catalogs used by the OpenAPI 1.1.0 contract.
CREATE TABLE "ESTADOS_INCIDENCIA" (
    "id_estado" SERIAL NOT NULL,
    "nombre_estado" TEXT NOT NULL,
    CONSTRAINT "ESTADOS_INCIDENCIA_pkey" PRIMARY KEY ("id_estado")
);
CREATE UNIQUE INDEX "ESTADOS_INCIDENCIA_nombre_estado_key" ON "ESTADOS_INCIDENCIA"("nombre_estado");

INSERT INTO "ESTADOS_INCIDENCIA" ("nombre_estado")
VALUES ('Reportada'), ('Asignada'), ('Resuelta');

CREATE TABLE "TIPOS_EVIDENCIA" (
    "id_tipo_evidencia" SERIAL NOT NULL,
    "nombre_tipo" TEXT NOT NULL,
    CONSTRAINT "TIPOS_EVIDENCIA_pkey" PRIMARY KEY ("id_tipo_evidencia")
);
CREATE UNIQUE INDEX "TIPOS_EVIDENCIA_nombre_tipo_key" ON "TIPOS_EVIDENCIA"("nombre_tipo");

INSERT INTO "TIPOS_EVIDENCIA" ("nombre_tipo")
VALUES ('Imagen'), ('Video'), ('Documento'), ('Otro');

-- Materialize the current state in the history before removing Incidencias.estado.
INSERT INTO "HistorialIncidencia" (
    "id_historial", "incidencia_id", "estado_anterior", "estado_nuevo", "usuario_id", "fecha"
)
SELECT
    gen_random_uuid()::text,
    i."id_incidencia",
    i."estado",
    i."estado",
    i."id_reportante",
    i."created_at"
FROM "Incidencias" i
LEFT JOIN LATERAL (
    SELECT h."estado_nuevo"
    FROM "HistorialIncidencia" h
    WHERE h."incidencia_id" = i."id_incidencia"
    ORDER BY h."fecha" DESC, h."id_historial" DESC
    LIMIT 1
) latest ON TRUE
WHERE latest."estado_nuevo" IS DISTINCT FROM i."estado";

ALTER TABLE "HistorialIncidencia" ADD COLUMN "id_estado" INTEGER;
UPDATE "HistorialIncidencia" h
SET "id_estado" = e."id_estado"
FROM "ESTADOS_INCIDENCIA" e
WHERE e."nombre_estado" = h."estado_nuevo"::text;
ALTER TABLE "HistorialIncidencia" ALTER COLUMN "id_estado" SET NOT NULL;

ALTER TABLE "HistorialIncidencia" DROP CONSTRAINT "HistorialIncidencia_incidencia_id_fkey";
DROP INDEX "HistorialIncidencia_incidencia_id_idx";
ALTER TABLE "HistorialIncidencia" RENAME COLUMN "incidencia_id" TO "id_incidencia";
ALTER TABLE "HistorialIncidencia" RENAME COLUMN "usuario_id" TO "id_usuario_cambio";
ALTER TABLE "HistorialIncidencia" RENAME COLUMN "fecha" TO "fecha_creacion";
ALTER TABLE "HistorialIncidencia" DROP COLUMN "estado_anterior";
ALTER TABLE "HistorialIncidencia" DROP COLUMN "estado_nuevo";
CREATE INDEX "HistorialIncidencia_id_incidencia_idx" ON "HistorialIncidencia"("id_incidencia");
CREATE INDEX "HistorialIncidencia_id_estado_idx" ON "HistorialIncidencia"("id_estado");
ALTER TABLE "HistorialIncidencia"
    ADD CONSTRAINT "HistorialIncidencia_id_incidencia_fkey"
    FOREIGN KEY ("id_incidencia") REFERENCES "Incidencias"("id_incidencia") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "HistorialIncidencia_id_estado_fkey"
    FOREIGN KEY ("id_estado") REFERENCES "ESTADOS_INCIDENCIA"("id_estado") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Incidencia state is now derived from the most recent history entry.
ALTER TABLE "Incidencias" DROP COLUMN "estado";
DROP TYPE "EstadoIncidencia";

-- Keep legacy order instructions and timestamps, but expose only contract fields.
ALTER TABLE "OrdenTrabajo" ADD COLUMN "diagnostico_tecnico" TEXT;
ALTER TABLE "OrdenTrabajo" DROP COLUMN "estado";
DROP TYPE "EstadoOrdenTrabajo";

-- Upgrade existing evidence rows while retaining their old description in-place.
ALTER TABLE "Evidencia" ADD COLUMN "id_tipo_evidencia" INTEGER;
ALTER TABLE "Evidencia" ADD COLUMN "url_cloudinary" TEXT;
ALTER TABLE "Evidencia" ALTER COLUMN "descripcion" DROP NOT NULL;
UPDATE "Evidencia"
SET
    "id_tipo_evidencia" = (SELECT "id_tipo_evidencia" FROM "TIPOS_EVIDENCIA" WHERE "nombre_tipo" = 'Otro'),
    "url_cloudinary" = 'legacy://evidencia/' || "id_evidencia"
WHERE "id_tipo_evidencia" IS NULL OR "url_cloudinary" IS NULL;
ALTER TABLE "Evidencia" ALTER COLUMN "id_tipo_evidencia" SET NOT NULL;
ALTER TABLE "Evidencia" ALTER COLUMN "url_cloudinary" SET NOT NULL;
CREATE INDEX "Evidencia_id_tipo_evidencia_idx" ON "Evidencia"("id_tipo_evidencia");
ALTER TABLE "Evidencia"
    ADD CONSTRAINT "Evidencia_id_tipo_evidencia_fkey"
    FOREIGN KEY ("id_tipo_evidencia") REFERENCES "TIPOS_EVIDENCIA"("id_tipo_evidencia") ON DELETE RESTRICT ON UPDATE CASCADE;
