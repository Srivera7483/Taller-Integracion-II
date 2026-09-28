import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const estados = [
    { id_estado: 1, nombre_estado: 'Reportada' },
    { id_estado: 2, nombre_estado: 'Asignada' },
    { id_estado: 3, nombre_estado: 'Resuelta' },
    { id_estado: 4, nombre_estado: 'Cerrada' },
    { id_estado: 5, nombre_estado: 'Rechazada' },
  ];

  for (const estado of estados) {
    await prisma.estadoIncidencia.upsert({
      where: { id_estado: estado.id_estado },
      update: { nombre_estado: estado.nombre_estado },
      create: estado,
    });
  }

  console.log('Seed de estados completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
