-- CreateEnum
CREATE TYPE "EstadoIncidencia" AS ENUM ('Reportada', 'Asignada', 'Resuelta');

-- AlterTable
ALTER TABLE "Incidencias"
ADD COLUMN "estado" "EstadoIncidencia" NOT NULL DEFAULT 'Reportada';
