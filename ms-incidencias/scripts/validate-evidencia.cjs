const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const columns = await prisma.$queryRawUnsafe(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'Evidencia' ORDER BY ordinal_position",
  );
  const foreignKeys = await prisma.$queryRawUnsafe(
    "SELECT kcu.column_name, ccu.table_name AS referenced_table, ccu.column_name AS referenced_column FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'Evidencia'",
  );

  console.log({ columns, foreignKeys });

  try {
    await prisma.evidencia.create({
      data: {
        incidencia_id: '00000000-0000-0000-0000-000000000000',
        descripcion: 'FK test',
      },
    });
    throw new Error('La FK aceptó una incidencia inexistente');
  } catch (error) {
    if (error.message === 'La FK aceptó una incidencia inexistente') {
      throw error;
    }
    console.log('FK inválida rechazada:', error.code ?? error.message);
  }

  const incidencia = await prisma.incidencias.create({
    data: {
      id_activo: 'test-activo',
      id_reportante: 'test-reportante',
      titulo: 'Cascade test',
      descripcion: 'Temporary test',
    },
  });

  await prisma.evidencia.create({
    data: {
      incidencia_id: incidencia.id_incidencia,
      descripcion: 'Cascade evidence',
    },
  });
  await prisma.incidencias.delete({
    where: { id_incidencia: incidencia.id_incidencia },
  });

  const remaining = await prisma.evidencia.count({
    where: { incidencia_id: incidencia.id_incidencia },
  });
  if (remaining !== 0) {
    throw new Error(`La cascada dejó ${remaining} evidencias`);
  }
  console.log('Cascada verificada: 0 evidencias restantes');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());