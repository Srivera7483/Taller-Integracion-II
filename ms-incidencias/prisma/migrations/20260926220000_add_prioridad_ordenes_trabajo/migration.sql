-- CreateEnum
CREATE TYPE "Prioridad" AS ENUM ('Alta', 'Media', 'Baja');

-- AlterTable
-- Migración para la tabla "ORDENES_TRABAJO" (OrdenTrabajo): agregar la columna prioridad
ALTER TABLE "OrdenTrabajo" ADD COLUMN "prioridad" "Prioridad" NOT NULL DEFAULT 'Media';

-- Agregar columna diagnostico_tecnico si aún no existe
ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "diagnostico_tecnico" TEXT;

-- Compatibilidad adicional: asegurar soporte si la tabla física fue nombrada "ORDENES_TRABAJO"
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
