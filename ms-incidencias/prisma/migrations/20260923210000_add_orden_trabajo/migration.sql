-- CreateEnum
CREATE TYPE "EstadoOrdenTrabajo" AS ENUM ('Pendiente', 'EnProceso', 'Completada', 'Cancelada');

-- CreateTable
CREATE TABLE "OrdenTrabajo" (
    "id_orden" TEXT NOT NULL,
    "incidencia_id" TEXT NOT NULL,
    "tecnico_id" TEXT NOT NULL,
    "estado" "EstadoOrdenTrabajo" NOT NULL DEFAULT 'Pendiente',
    "instrucciones" TEXT,
    "fecha_asignacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_inicio" TIMESTAMP,
    "fecha_termino" TIMESTAMP,

    CONSTRAINT "OrdenTrabajo_pkey" PRIMARY KEY ("id_orden")
);

-- CreateIndex
CREATE INDEX "OrdenTrabajo_incidencia_id_idx" ON "OrdenTrabajo"("incidencia_id");

-- CreateIndex
CREATE INDEX "OrdenTrabajo_tecnico_id_idx" ON "OrdenTrabajo"("tecnico_id");

-- AddForeignKey
ALTER TABLE "OrdenTrabajo"
ADD CONSTRAINT "OrdenTrabajo_incidencia_id_fkey"
FOREIGN KEY ("incidencia_id") REFERENCES "Incidencias"("id_incidencia")
ON DELETE CASCADE ON UPDATE CASCADE;
