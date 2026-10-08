const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
require('dotenv').config();

const prisma = new PrismaClient();

async function asegurarMigraciones() {
  try {
    await prisma.$queryRawUnsafe('SELECT 1 FROM "TIPOS_EVIDENCIA" LIMIT 1;');
  } catch (err) {
    if (err.code === 'P2021' || (err.message && err.message.includes('does not exist'))) {
      console.log('⚠️  Las tablas relacionales no existen aún en la base de datos.');
      console.log('🔄 Ejecutando "prisma migrate deploy" para sincronizar el esquema...\n');
      try {
        execSync('pnpm exec prisma migrate deploy', { stdio: 'inherit', cwd: __dirname });
      } catch {
        try {
          execSync('npx prisma migrate deploy', { stdio: 'inherit', cwd: __dirname });
        } catch (migErr) {
          console.error('❌ Error ejecutando migraciones:', migErr.message);
          throw new Error('Ejecuta primero: pnpm --dir ms-incidencias exec prisma migrate deploy');
        }
      }
      console.log('\n✅ Esquema de tablas sincronizado exitosamente.\n');
    }
  }
}

async function main() {
  console.log('=====================================================');
  console.log('🚀 Iniciando inyección de datos de prueba (Evidencias)');
  console.log('=====================================================\n');

  // Asegurar que las tablas relacionales existan en la BD antes de insertar
  await asegurarMigraciones();

  // 1. Asegurar la existencia del Tipo de Evidencia
  const tipo = await prisma.tipoEvidencia.upsert({
    where: { id_tipo_evidencia: 1 },
    update: { nombre_tipo: 'Fotografía del Fallo' },
    create: {
      id_tipo_evidencia: 1,
      nombre_tipo: 'Fotografía del Fallo',
    },
  });
  console.log(`✅ Tipo de evidencia asegurado: [${tipo.id_tipo_evidencia}] ${tipo.nombre_tipo}`);

  // 2. Asegurar el Estado inicial de la Incidencia
  const estadoReportada = await prisma.estadoIncidencia.upsert({
    where: { id_estado: 1 },
    update: { nombre_estado: 'Reportada' },
    create: {
      id_estado: 1,
      nombre_estado: 'Reportada',
    },
  });
  console.log(`✅ Estado asegurado: [${estadoReportada.id_estado}] ${estadoReportada.nombre_estado}`);

  // 3. Crear o actualizar Incidencia de prueba con UUID fijo para pruebas
  const ID_INCIDENCIA_TEST = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const ID_ACTIVO_TEST = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const ID_REPORTANTE_TEST = 'd4e5f6a7-b8c9-0123-4567-89abcdef0123';
  const ID_TECNICO_TEST = 'e5f6a7b8-c9d0-1234-5678-9abcdef01234';

  const incidencia = await prisma.incidencias.upsert({
    where: { id_incidencia: ID_INCIDENCIA_TEST },
    update: {
      titulo: 'Proyector con sobrecalentamiento y fallo de imagen',
      descripcion: 'El proyector láser del Auditorio Principal se apaga tras 10 minutos de uso y la luz frontal parpadea en rojo indicando alta temperatura.',
      id_activo: ID_ACTIVO_TEST,
      id_reportante: ID_REPORTANTE_TEST,
    },
    create: {
      id_incidencia: ID_INCIDENCIA_TEST,
      id_activo: ID_ACTIVO_TEST,
      id_reportante: ID_REPORTANTE_TEST,
      titulo: 'Proyector con sobrecalentamiento y fallo de imagen',
      descripcion: 'El proyector láser del Auditorio Principal se apaga tras 10 minutos de uso y la luz frontal parpadea en rojo indicando alta temperatura.',
    },
  });
  console.log(`✅ Incidencia de prueba asegurada: [${incidencia.id_incidencia}] "${incidencia.titulo}"`);

  // Asegurar registro en HISTORIAL_ESTADOS si no existe
  const historialExistente = await prisma.historialEstados.findFirst({
    where: { id_incidencia: incidencia.id_incidencia },
  });

  if (!historialExistente) {
    await prisma.historialEstados.create({
      data: {
        id_incidencia: incidencia.id_incidencia,
        id_estado: estadoReportada.id_estado,
        id_usuario_cambio: ID_REPORTANTE_TEST,
      },
    });
    console.log('✅ Historial de estados inicial registrado');
  }

  // 4. Inyectar 3 URLs falsas en la columna "url_cloudinary" de la tabla EVIDENCIAS
  const evidenciasFalsas = [
    {
      id_evidencia: 'e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a01',
      id_incidencia: incidencia.id_incidencia,
      id_tipo_evidencia: tipo.id_tipo_evidencia,
      url_cloudinary: 'https://res.cloudinary.com/infra-uct/image/upload/v1728345601/evidencias/falla_panel_proyector.jpg',
    },
    {
      id_evidencia: 'e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a02',
      id_incidencia: incidencia.id_incidencia,
      id_tipo_evidencia: tipo.id_tipo_evidencia,
      url_cloudinary: 'https://res.cloudinary.com/infra-uct/image/upload/v1728345602/evidencias/sensor_temperatura_alerta.jpg',
    },
    {
      id_evidencia: 'e1f2a3b4-c5d6-7e8f-9a0b-1c2d3e4f5a03',
      id_incidencia: incidencia.id_incidencia,
      id_tipo_evidencia: tipo.id_tipo_evidencia,
      url_cloudinary: 'https://res.cloudinary.com/infra-uct/image/upload/v1728345603/evidencias/conector_hdmi_danado.jpg',
    },
  ];

  console.log('\n📸 Inyectando 3 URLs falsas de Cloudinary en la tabla EVIDENCIAS:');
  for (const [index, ev] of evidenciasFalsas.entries()) {
    const guardada = await prisma.evidencia.upsert({
      where: { id_evidencia: ev.id_evidencia },
      update: {
        url_cloudinary: ev.url_cloudinary,
        id_tipo_evidencia: ev.id_tipo_evidencia,
      },
      create: ev,
    });
    console.log(`   [${index + 1}/3] ID: ${guardada.id_evidencia}`);
    console.log(`         Columna url_cloudinary: ${guardada.url_cloudinary}`);
  }

  // 5. Asegurar Orden de Trabajo asociada para que el rol Técnico también la visualice
  const ID_ORDEN_TEST = 'b1c2d3e4-f5a6-7890-abcd-ef1234567890';
  const orden = await prisma.ordenTrabajo.upsert({
    where: { id_orden: ID_ORDEN_TEST },
    update: {
      id_incidencia: incidencia.id_incidencia,
      id_tecnico: ID_TECNICO_TEST,
      diagnostico_tecnico: 'Revisión en terreno requerida. Ventiladores con bloqueo de pelusa.',
    },
    create: {
      id_orden: ID_ORDEN_TEST,
      id_incidencia: incidencia.id_incidencia,
      id_tecnico: ID_TECNICO_TEST,
      diagnostico_tecnico: 'Revisión en terreno requerida. Ventiladores con bloqueo de pelusa.',
    },
  });
  console.log(`\n🛠️  Orden de trabajo asegurada: [${orden.id_orden}] para Técnico ID [${orden.id_tecnico}]`);

  console.log('\n=====================================================');
  console.log('🎉 Semilla completada con éxito.');
  console.log(`📌 Incidencia ID para pruebas en el Frontend: ${incidencia.id_incidencia}`);
  console.log(`🌐 Ruta de vista en Frontend: /incidencias/${incidencia.id_incidencia}`);
  console.log(`🛠️  Ruta de orden para Técnico: /ordenes/${orden.id_orden}`);
  console.log('=====================================================');
}

main()
  .catch((e) => {
    console.error('❌ Error inyectando evidencias de prueba:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
