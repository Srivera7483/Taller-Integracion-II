/*
  Warnings:

  - You are about to alter the column `nombre_estado` on the `ESTADOS_INCIDENCIA` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `nombre_tipo` on the `TIPOS_EVIDENCIA` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to drop the `Evidencia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HistorialIncidencia` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Incidencias` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OrdenTrabajo` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Evidencia" DROP CONSTRAINT "Evidencia_id_tipo_evidencia_fkey";

-- DropForeignKey
ALTER TABLE "Evidencia" DROP CONSTRAINT "Evidencia_incidencia_id_fkey";

-- DropForeignKey
ALTER TABLE "HistorialIncidencia" DROP CONSTRAINT "HistorialIncidencia_id_estado_fkey";

-- DropForeignKey
ALTER TABLE "HistorialIncidencia" DROP CONSTRAINT "HistorialIncidencia_id_incidencia_fkey";

-- DropForeignKey
ALTER TABLE "OrdenTrabajo" DROP CONSTRAINT "OrdenTrabajo_incidencia_id_fkey";

-- DropIndex
DROP INDEX "ESTADOS_INCIDENCIA_nombre_estado_key";

-- DropIndex
DROP INDEX "TIPOS_EVIDENCIA_nombre_tipo_key";

-- AlterTable
ALTER TABLE "ESTADOS_INCIDENCIA" ALTER COLUMN "nombre_estado" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "TIPOS_EVIDENCIA" ALTER COLUMN "nombre_tipo" SET DATA TYPE VARCHAR(100);

-- DropTable
DROP TABLE "Evidencia";

-- DropTable
DROP TABLE "HistorialIncidencia";

-- DropTable
DROP TABLE "Incidencias";

-- DropTable
DROP TABLE "OrdenTrabajo";

-- CreateTable
CREATE TABLE "INCIDENCIAS" (
    "id_incidencia" UUID NOT NULL,
    "id_activo" UUID NOT NULL,
    "id_reportante" UUID NOT NULL,
    "titulo" VARCHAR(255) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "fecha_creacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "INCIDENCIAS_pkey" PRIMARY KEY ("id_incidencia")
);

-- CreateTable
CREATE TABLE "HISTORIAL_ESTADOS" (
    "id_historial" UUID NOT NULL,
    "id_incidencia" UUID NOT NULL,
    "id_estado" INTEGER NOT NULL,
    "id_usuario_cambio" UUID NOT NULL,
    "fecha_creacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HISTORIAL_ESTADOS_pkey" PRIMARY KEY ("id_historial")
);

-- CreateTable
CREATE TABLE "ORDENES_TRABAJO" (
    "id_orden" UUID NOT NULL,
    "id_incidencia" UUID NOT NULL,
    "id_tecnico" UUID NOT NULL,
    "diagnostico_tecnico" TEXT,
    "fecha_creacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ORDENES_TRABAJO_pkey" PRIMARY KEY ("id_orden")
);

-- CreateTable
CREATE TABLE "EVIDENCIAS" (
    "id_evidencia" UUID NOT NULL,
    "id_incidencia" UUID NOT NULL,
    "id_tipo_evidencia" INTEGER NOT NULL,
    "url_cloudinary" VARCHAR(500) NOT NULL,
    "fecha_creacion" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EVIDENCIAS_pkey" PRIMARY KEY ("id_evidencia")
);

-- CreateIndex
CREATE INDEX "HISTORIAL_ESTADOS_id_incidencia_idx" ON "HISTORIAL_ESTADOS"("id_incidencia");

-- CreateIndex
CREATE INDEX "HISTORIAL_ESTADOS_id_estado_idx" ON "HISTORIAL_ESTADOS"("id_estado");

-- CreateIndex
CREATE INDEX "ORDENES_TRABAJO_id_incidencia_idx" ON "ORDENES_TRABAJO"("id_incidencia");

-- CreateIndex
CREATE INDEX "ORDENES_TRABAJO_id_tecnico_idx" ON "ORDENES_TRABAJO"("id_tecnico");

-- CreateIndex
CREATE INDEX "EVIDENCIAS_id_incidencia_idx" ON "EVIDENCIAS"("id_incidencia");

-- CreateIndex
CREATE INDEX "EVIDENCIAS_id_tipo_evidencia_idx" ON "EVIDENCIAS"("id_tipo_evidencia");

-- AddForeignKey
ALTER TABLE "HISTORIAL_ESTADOS" ADD CONSTRAINT "HISTORIAL_ESTADOS_id_incidencia_fkey" FOREIGN KEY ("id_incidencia") REFERENCES "INCIDENCIAS"("id_incidencia") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HISTORIAL_ESTADOS" ADD CONSTRAINT "HISTORIAL_ESTADOS_id_estado_fkey" FOREIGN KEY ("id_estado") REFERENCES "ESTADOS_INCIDENCIA"("id_estado") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ORDENES_TRABAJO" ADD CONSTRAINT "ORDENES_TRABAJO_id_incidencia_fkey" FOREIGN KEY ("id_incidencia") REFERENCES "INCIDENCIAS"("id_incidencia") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EVIDENCIAS" ADD CONSTRAINT "EVIDENCIAS_id_incidencia_fkey" FOREIGN KEY ("id_incidencia") REFERENCES "INCIDENCIAS"("id_incidencia") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EVIDENCIAS" ADD CONSTRAINT "EVIDENCIAS_id_tipo_evidencia_fkey" FOREIGN KEY ("id_tipo_evidencia") REFERENCES "TIPOS_EVIDENCIA"("id_tipo_evidencia") ON DELETE RESTRICT ON UPDATE CASCADE;
