import { PrismaClient, CategoriaActivo, EstadoActivo } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando el seeding de ms-activos...');

  await prisma.mantenimiento.deleteMany();
  await prisma.activo.deleteMany();

  const activo1 = await prisma.activo.create({
    data: {
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      codigoQr: 'ACT-2026-0001',
      nombre: 'Proyector Láser Epson PowerLite',
      categoria: CategoriaActivo.AUDIOVISUAL,
      modelo: 'PowerLite L210W',
      numeroSerie: 'EPS-998877',
      ubicacion: 'Auditorio Principal',
      estado: EstadoActivo.OPERATIVO,
    },
  });

  const activo2 = await prisma.activo.create({
    data: {
      id: '550e8400-e29b-41d4-a716-446655440000',
      codigoQr: 'ACT-2026-0002',
      nombre: 'Computador Dell OptiPlex',
      categoria: CategoriaActivo.COMPUTO,
      modelo: 'OptiPlex 7000',
      numeroSerie: 'DELL-112233',
      ubicacion: 'Laboratorio de Computación 1',
      estado: EstadoActivo.EN_REVISION,
    },
  });

  const activo3 = await prisma.activo.create({
    data: {
      id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      codigoQr: 'ACT-2026-0003',
      nombre: 'Switch Cisco Catalyst',
      categoria: CategoriaActivo.REDES,
      modelo: 'Catalyst 9200',
      numeroSerie: 'CSC-554433',
      ubicacion: 'Sala de Servidores',
      estado: EstadoActivo.OPERATIVO,
    },
  }); 

  // Inyectar datos de prueba para mantenimientos_preventivos
  const fechaHoy = new Date();
  const fechaEn5Dias = new Date(fechaHoy.getTime() + 5 * 24 * 60 * 60 * 1000);
  const fechaEn12Dias = new Date(fechaHoy.getTime() + 12 * 24 * 60 * 60 * 1000);

  const mant1 = await prisma.mantenimiento.create({
    data: {
      id_mantenimiento: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      id_activo: activo1.id,
      fecha_programada: fechaEn5Dias,
      fecha_creacion: fechaHoy,
    },
  });

  const mant2 = await prisma.mantenimiento.create({
    data: {
      id_mantenimiento: 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e',
      id_activo: activo2.id,
      fecha_programada: fechaEn12Dias,
      fecha_creacion: fechaHoy,
    },
  });

  console.log('✅ Seeding completado exitosamente.');
  console.log('Activos creados para pruebas:');
  console.log(`- ${activo1.nombre} (ID: ${activo1.id})`);
  console.log(`- ${activo2.nombre} (ID: ${activo2.id})`);
  console.log(`- ${activo3.nombre} (ID: ${activo3.id})`);
  console.log('Mantenimientos preventivos creados para pruebas:');
  console.log(`- Mantenimiento para ${activo1.nombre} (ID: ${mant1.id_mantenimiento}, Programado: ${fechaEn5Dias.toISOString()})`);
  console.log(`- Mantenimiento para ${activo2.nombre} (ID: ${mant2.id_mantenimiento}, Programado: ${fechaEn12Dias.toISOString()})`);
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
