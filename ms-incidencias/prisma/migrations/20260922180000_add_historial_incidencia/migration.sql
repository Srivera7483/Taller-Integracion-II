-- CreateTable
CREATE TABLE "HistorialIncidencia" (
    "id_historial" TEXT NOT NULL,
    "incidencia_id" TEXT NOT NULL,
    "estado_anterior" "EstadoIncidencia" NOT NULL,
    "estado_nuevo" "EstadoIncidencia" NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialIncidencia_pkey" PRIMARY KEY ("id_historial")
);

-- CreateIndex
CREATE INDEX "HistorialIncidencia_incidencia_id_idx" ON "HistorialIncidencia"("incidencia_id");

-- AddForeignKey
ALTER TABLE "HistorialIncidencia"
ADD CONSTRAINT "HistorialIncidencia_incidencia_id_fkey"
FOREIGN KEY ("incidencia_id") REFERENCES "Incidencias"("id_incidencia")
ON DELETE CASCADE ON UPDATE CASCADE;
