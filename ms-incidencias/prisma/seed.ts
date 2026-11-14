import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const estados = [
    { id_estado: 1, nombre_estado: 'Reportada' },
    { id_estado: 2, nombre_estado: 'Asignada' },
    { id_estado: 3, nombre_estado: 'Resuelta' },
    { id_estado: 4, nombre_estado: 'Cerrada' },
    { id_estado: 5, nombre_estado: 'Rechazada' },
    { id_estado: 6, nombre_estado: 'Completada' },
  ];

  for (const estado of estados) {
    await prisma.estadoIncidencia.upsert({
      where: { id_estado: estado.id_estado },
      update: { nombre_estado: estado.nombre_estado },
      create: estado,
    });
  }

  const tiposEvidencia = [
    { id_tipo_evidencia: 1, nombre_tipo: 'Imagen' },
    { id_tipo_evidencia: 2, nombre_tipo: 'Video' },
    { id_tipo_evidencia: 3, nombre_tipo: 'Documento' },
    { id_tipo_evidencia: 4, nombre_tipo: 'Otro' },
  ];

  for (const tipo of tiposEvidencia) {
    await prisma.tipoEvidencia.upsert({
      where: { id_tipo_evidencia: tipo.id_tipo_evidencia },
      update: { nombre_tipo: tipo.nombre_tipo },
      create: tipo,
    });
  }

  console.log('Seed de estados y tipos de evidencia completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
