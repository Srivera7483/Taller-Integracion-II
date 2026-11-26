-- TAL-199: Homologación OpenAPI TI-II / TI-IV
-- 1. Ampliar longitud máxima de titulo en INCIDENCIAS de 100 a 255 caracteres.
-- 2. Agregar comentario opcional en HISTORIAL_ESTADOS para trazabilidad RF6.

ALTER TABLE "INCIDENCIAS"
  ALTER COLUMN "titulo" SET DATA TYPE VARCHAR(255);

ALTER TABLE "HISTORIAL_ESTADOS"
  ADD COLUMN IF NOT EXISTS "comentario" VARCHAR(500);
