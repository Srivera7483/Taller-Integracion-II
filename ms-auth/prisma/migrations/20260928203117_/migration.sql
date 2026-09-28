/*
  Warnings:

  - You are about to drop the `Permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_PermissionToRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- DropForeignKey
ALTER TABLE "_PermissionToRole" DROP CONSTRAINT "_PermissionToRole_A_fkey";

-- DropForeignKey
ALTER TABLE "_PermissionToRole" DROP CONSTRAINT "_PermissionToRole_B_fkey";

-- DropTable
DROP TABLE "Permission";

-- DropTable
DROP TABLE "Role";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "_PermissionToRole";

-- CreateTable
CREATE TABLE "ROLES" (
    "id_rol" SERIAL NOT NULL,
    "nombre_rol" TEXT NOT NULL,

    CONSTRAINT "ROLES_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "USUARIOS" (
    "id_usuario" TEXT NOT NULL,
    "rut_o_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "fecha_creacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_eliminacion" TIMESTAMP(3),

    CONSTRAINT "USUARIOS_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "PERMISOS" (
    "id_permiso" SERIAL NOT NULL,
    "nombre_permiso" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "PERMISOS_pkey" PRIMARY KEY ("id_permiso")
);

-- CreateTable
CREATE TABLE "ROLES_PERMISOS" (
    "id_rol" INTEGER NOT NULL,
    "id_permiso" INTEGER NOT NULL,

    CONSTRAINT "ROLES_PERMISOS_pkey" PRIMARY KEY ("id_rol","id_permiso")
);

-- CreateIndex
CREATE UNIQUE INDEX "USUARIOS_rut_o_id_key" ON "USUARIOS"("rut_o_id");

-- CreateIndex
CREATE UNIQUE INDEX "USUARIOS_email_key" ON "USUARIOS"("email");

-- AddForeignKey
ALTER TABLE "USUARIOS" ADD CONSTRAINT "USUARIOS_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "ROLES"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ROLES_PERMISOS" ADD CONSTRAINT "ROLES_PERMISOS_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "ROLES"("id_rol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ROLES_PERMISOS" ADD CONSTRAINT "ROLES_PERMISOS_id_permiso_fkey" FOREIGN KEY ("id_permiso") REFERENCES "PERMISOS"("id_permiso") ON DELETE RESTRICT ON UPDATE CASCADE;
