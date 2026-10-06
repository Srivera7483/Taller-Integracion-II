-- CreateTable
CREATE TABLE "Incidencias" (
    "id_incidencia" TEXT NOT NULL,
    "id_activo" TEXT NOT NULL,
    "id_reportante" TEXT NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incidencias_pkey" PRIMARY KEY ("id_incidencia")
);

-- CreateIndex
CREATE UNIQUE INDEX "Incidencias_id_incidencia_key" ON "Incidencias"("id_incidencia");
