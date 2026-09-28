/*
  Warnings:

  - A unique constraint covering the columns `[rut_o_id]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `rut_o_id` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "apellido" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "rut_o_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_rut_o_id_key" ON "User"("rut_o_id");
