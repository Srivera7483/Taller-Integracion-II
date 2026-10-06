/*
  Warnings:

  - A unique constraint covering the columns `[nombre_rol]` on the table `ROLES` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ROLES_nombre_rol_key" ON "ROLES"("nombre_rol");
