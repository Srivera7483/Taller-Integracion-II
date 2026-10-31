-- DropTable
DROP TABLE IF EXISTS "mantenimientos" CASCADE;

-- CreateTable
CREATE TABLE "mantenimientos_preventivos" (
    "id_mantenimiento" TEXT NOT NULL,
    "id_activo" TEXT NOT NULL,
    "fecha_programada" TIMESTAMP(3) NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mantenimientos_preventivos_pkey" PRIMARY KEY ("id_mantenimiento")
);

-- AddForeignKey
ALTER TABLE "mantenimientos_preventivos" ADD CONSTRAINT "mantenimientos_preventivos_id_activo_fkey" FOREIGN KEY ("id_activo") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

