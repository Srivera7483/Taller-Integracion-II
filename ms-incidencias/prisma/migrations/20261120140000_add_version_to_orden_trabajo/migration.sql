-- Add version column to ORDENES_TRABAJO table
ALTER TABLE "ORDENES_TRABAJO" ADD "version" INTEGER NOT NULL DEFAULT 1;

-- Update existing rows to have version 1 (in case there are pre-existing records)
UPDATE "ORDENES_TRABAJO" SET "version" = 1 WHERE "version" IS NULL;

-- Add comment
COMMENT ON COLUMN "ORDENES_TRABAJO"."version" IS 'Versión optimista para control de concurrencia';
