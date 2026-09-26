-- CreateTable
CREATE TABLE "Evidencia" (
    "id_evidencia" TEXT NOT NULL,
    "incidencia_id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidencia_pkey" PRIMARY KEY ("id_evidencia")
);

-- CreateIndex
CREATE INDEX "Evidencia_incidencia_id_idx" ON "Evidencia"("incidencia_id");

-- AddForeignKey
ALTER TABLE "Evidencia" ADD CONSTRAINT "Evidencia_incidencia_id_fkey" FOREIGN KEY ("incidencia_id") REFERENCES "Incidencias"("id_incidencia") ON DELETE CASCADE ON UPDATE CASCADE;
