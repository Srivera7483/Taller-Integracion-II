-- Migration for TAL-194: Clasificacion de Prioridad y Resolucion de Incidencias

-- AlterEnum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type typ
    INNER JOIN pg_enum enu ON typ.oid = enu.enumtypid
    WHERE typ.typname = 'PrioridadIncidencia' AND enu.enumlabel = 'critica'
  ) THEN
    ALTER TYPE "PrioridadIncidencia" ADD VALUE 'critica';
  END IF;
END $$;

-- AlterTable
ALTER TABLE "ORDENES_TRABAJO" ADD COLUMN IF NOT EXISTS "fecha_cierre" TIMESTAMP;

