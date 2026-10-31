-- CreateEnum
CREATE TYPE "EstadoActivo" AS ENUM ('OPERATIVO', 'EN_MANTENIMIENTO', 'EN_REVISION', 'DADO_DE_BAJA');

-- CreateEnum
CREATE TYPE "CategoriaActivo" AS ENUM ('AUDIOVISUAL', 'COMPUTO', 'REDES', 'ELECTRICO', 'MOBILIARIO', 'OTRO');

-- CreateTable
CREATE TABLE "activos" (
    "id" TEXT NOT NULL,
    "codigo_qr" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaActivo" NOT NULL,
    "modelo" TEXT,
    "numero_serie" TEXT,
    "ubicacion" TEXT NOT NULL,
    "estado" "EstadoActivo" NOT NULL DEFAULT 'OPERATIVO',
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mantenimientos" (
    "id" TEXT NOT NULL,
    "id_activo" TEXT NOT NULL,
    "fecha_programada" TIMESTAMP(3) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Pendiente',

    CONSTRAINT "mantenimientos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activos_codigo_qr_key" ON "activos"("codigo_qr");

-- AddForeignKey
ALTER TABLE "mantenimientos" ADD CONSTRAINT "mantenimientos_id_activo_fkey" FOREIGN KEY ("id_activo") REFERENCES "activos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
