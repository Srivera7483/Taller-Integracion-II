const { PrismaClient: AuthPrisma } = require('./ms-auth/node_modules/@prisma/client');
const { PrismaClient: ActivosPrisma } = require('./ms-activos/node_modules/@prisma/client');
const { PrismaClient: IncidenciasPrisma } = require('./ms-incidencias/node_modules/@prisma/client');
const argon2 = require('./ms-auth/node_modules/argon2');
const crypto = require('node:crypto');

const authPrisma = new AuthPrisma({ datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5435/auth_db' } } });
const activosPrisma = new ActivosPrisma({ datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5433/activos_db?schema=public' } } });
const incidenciasPrisma = new IncidenciasPrisma({ datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5434/incidencias_db?schema=public' } } });

async function main() {
  console.log('Iniciando carga de datos reales UCT para la Demo (con Mantenimientos)...');

  // ==========================================
  // 1. ROLES Y USUARIOS
  // ==========================================
  const rolAdmin = await authPrisma.role.upsert({ where: { nombreRol: 'ADMINISTRADOR' }, update: {}, create: { nombreRol: 'ADMINISTRADOR' } });
  const rolSupervisor = await authPrisma.role.upsert({ where: { nombreRol: 'SUPERVISOR' }, update: {}, create: { nombreRol: 'SUPERVISOR' } }); // <-- AGREGADO
  const rolTecnico = await authPrisma.role.upsert({ where: { nombreRol: 'TECNICO' }, update: {}, create: { nombreRol: 'TECNICO' } });
  const rolReportante = await authPrisma.role.upsert({ where: { nombreRol: 'REPORTANTE' }, update: {}, create: { nombreRol: 'REPORTANTE' } });

  const hash = await argon2.hash('password123');

  const usuariosData = [
    // Administradores
    { rut: '00000000-0', nombre: 'Admin', apellido: '01', email: 'administrador@uct.cl', role: rolAdmin.id },
    { rut: '00000000-1', nombre: 'Diego Antonio', apellido: 'Hernández Martínez', email: 'dhernandez@uct.cl', role: rolAdmin.id },
    { rut: '00000000-2', nombre: 'Loreto', apellido: 'Paredes', email: 'lparedes@uct.cl', role: rolAdmin.id },

    // Supervisores
    { rut: '10000000-0', nombre: 'Supervisor', apellido: '01', email: 'supervisor@uct.cl', role: rolSupervisor.id },
    { rut: '10000000-1', nombre: 'Benjamin', apellido: 'Soto', email: 'bsoto@uct.cl', role: rolSupervisor.id },
    { rut: '10000000-2', nombre: 'Sebastian', apellido: 'Rivera', email: 'srivera@uct.cl', role: rolSupervisor.id },

    // Tecnicos
    { rut: '20000000-0', nombre: 'Tecnico', apellido: '01', email: 'tecnico@uct.cl', role: rolTecnico.id },
    { rut: '20000000-1', nombre: 'Eduardo', apellido: 'Necul', email: 'enecul@uct.cl', role: rolTecnico.id },
    { rut: '20000000-2', nombre: 'Axel', apellido: 'Gonzalez', email: 'agonzalez@uct.cl', role: rolTecnico.id },
    { rut: '20000000-3', nombre: 'Simon', apellido: 'Molina', email: 'smolina@uct.cl', role: rolTecnico.id },

    // Reportantes
    { rut: '30000000-0', nombre: 'Reportante', apellido: '01', email: 'reportante@uct.cl', role: rolReportante.id },
    { rut: '30000000-1', nombre: 'Miku', apellido: 'Hatsune', email: 'mhatsune@uct.cl', role: rolReportante.id },
    { rut: '30000000-2', nombre: 'Rin', apellido: 'Kagamine', email: 'rkagamine@uct.cl', role: rolReportante.id },
    { rut: '30000000-3', nombre: 'Len', apellido: 'Kagamine', email: 'lkagamine@uct.cl', role: rolReportante.id },
  ];

  const tecnicosCreados = [];
  const reportantesCreados = []; // <-- Arreglo para guardar los IDs de los reportantes reales

  for (const u of usuariosData) {
    const porEmail = await authPrisma.user.findUnique({ where: { email: u.email } });
    const porRut = await authPrisma.user.findUnique({ where: { rut_o_id: u.rut } });

    let user;
    if (porEmail) {
      user = await authPrisma.user.update({
        where: { id: porEmail.id },
        data: {
          ...(!porRut || porRut.id === porEmail.id ? { rut_o_id: u.rut } : {}),
          nombre: u.nombre,
          apellido: u.apellido,
          passwordHash: hash,
          roleId: u.role,
          fechaEliminacion: null,
        },
      });
    } else if (porRut) {
      user = await authPrisma.user.update({
        where: { id: porRut.id },
        data: {
          nombre: u.nombre,
          apellido: u.apellido,
          email: u.email,
          passwordHash: hash,
          roleId: u.role,
          fechaEliminacion: null,
        },
      });
    } else {
      user = await authPrisma.user.create({
        data: {
          rut_o_id: u.rut,
          nombre: u.nombre,
          apellido: u.apellido,
          email: u.email,
          passwordHash: hash,
          roleId: u.role,
        },
      });
    }

    if (u.role === rolTecnico.id) tecnicosCreados.push(user.id || user.userId);
    if (u.role === rolReportante.id) reportantesCreados.push(user.id || user.userId);
  }
  console.log('Usuarios reales creados, incluyendo Supervisor y Reportantes.');

  // ==========================================
  // 2. ACTIVOS Y MANTENIMIENTOS
  // ==========================================
  await activosPrisma.mantenimiento.deleteMany();
  await activosPrisma.activo.deleteMany();

  const activosData = [
    { id: crypto.randomUUID(), qr: 'UCT-PRJ-01', nombre: 'Proyector Epson PowerLite', cat: 'AUDIOVISUAL', mod: 'L210W', ubi: 'Edificio C - Sala C101' },
    { id: crypto.randomUUID(), qr: 'UCT-PRJ-02', nombre: 'Proyector Epson PowerLite', cat: 'AUDIOVISUAL', mod: 'L210W', ubi: 'Edificio C - Sala C102' },
    { id: crypto.randomUUID(), qr: 'UCT-PRJ-03', nombre: 'Proyector ViewSonic', cat: 'AUDIOVISUAL', mod: 'PA503S', ubi: 'Edificio E - Auditorio' },
    { id: crypto.randomUUID(), qr: 'UCT-PRJ-04', nombre: 'Proyector Sony', cat: 'AUDIOVISUAL', mod: 'VPL-EX450', ubi: 'Biblioteca San Francisco - Sala Estudio 1' },
    { id: crypto.randomUUID(), qr: 'UCT-PC-01', nombre: 'Computador Dell OptiPlex', cat: 'COMPUTO', mod: '7000 MFF', ubi: 'Laboratorio TI 1 - Módulo 1' },
    { id: crypto.randomUUID(), qr: 'UCT-PC-02', nombre: 'Computador Dell OptiPlex', cat: 'COMPUTO', mod: '7000 MFF', ubi: 'Laboratorio TI 1 - Módulo 2' },
    { id: crypto.randomUUID(), qr: 'UCT-PC-06', nombre: 'HP ProDesk 400', cat: 'COMPUTO', mod: 'G7 SFF', ubi: 'Biblioteca San Francisco - Recepción' },
    { id: crypto.randomUUID(), qr: 'UCT-SW-01', nombre: 'Switch Cisco Catalyst', cat: 'REDES', mod: 'Catalyst 9200', ubi: 'Sala de Servidores' }
  ];

  const activosCreados = [];
  for (const act of activosData) {
    const nuevoActivo = await activosPrisma.activo.create({
      data: { id: act.id, codigoQr: act.qr, nombre: act.nombre, categoria: act.cat, modelo: act.mod, numeroSerie: `SN-${act.qr}`, ubicacion: act.ubi, estado: 'OPERATIVO' }
    });
    activosCreados.push(nuevoActivo);
  }
  console.log('✅ Activos (Computadores, Proyectores, Redes) creados.');

  const fechaHoy = new Date();

  const mantenimientosBase = [
    { id_activo: activosCreados[0].id, dias: 5 },
    { id_activo: activosCreados[7].id, dias: 12 },
    { id_activo: activosCreados[4].id, dias: 1 }
  ];

  for (const mant of mantenimientosBase) {
    await activosPrisma.mantenimiento.create({
      data: {
        id_mantenimiento: crypto.randomUUID(),
        id_activo: mant.id_activo,
        fecha_programada: new Date(fechaHoy.getTime() + mant.dias * 24 * 60 * 60 * 1000),
        fecha_creacion: fechaHoy,
      }
    });
  }
  console.log(`${mantenimientosBase.length} Mantenimientos preventivos programados.`);

  // ==========================================
  // 3. ESTADOS E INCIDENCIAS
  // ==========================================
  const estadosBase = [
    { id_estado: 1, nombre_estado: 'Reportada' }, { id_estado: 2, nombre_estado: 'Asignada' },
    { id_estado: 3, nombre_estado: 'Resuelta' }, { id_estado: 4, nombre_estado: 'Cerrada' },
    { id_estado: 5, nombre_estado: 'Rechazada' }, { id_estado: 6, nombre_estado: 'Completada' }
  ];
  for (const eb of estadosBase) {
    await incidenciasPrisma.estadoIncidencia.upsert({ where: { id_estado: eb.id_estado }, update: {}, create: eb });
  }

  await incidenciasPrisma.historialEstados.deleteMany();
  await incidenciasPrisma.incidencias.deleteMany();

  const problemasEscolares = [
    { t: 'Proyector con imagen amarillenta', d: 'La lámpara del proyector parece estar agotándose.' },
    { t: 'Computador no da video', d: 'El equipo enciende pero el monitor dice "No Signal".' },
    { t: 'Switch parpadea en rojo', d: 'El puerto 14 del switch core de la sala de servidores marca colisión constante.' },
    { t: 'Equipo extremadamente lento', d: 'Al abrir software pesado, el equipo se congela por completo.' },
  ];

  for (let i = 0; i < 20; i++) {
    const activo = activosCreados[Math.floor(Math.random() * activosCreados.length)];
    const problema = problemasEscolares[Math.floor(Math.random() * problemasEscolares.length)];
    const tecnicoResp = tecnicosCreados[Math.floor(Math.random() * tecnicosCreados.length)];

    // <-- Seleccionamos un reportante aleatorio del nuevo arreglo en lugar del Admin
    const idReportanteAleatorio = reportantesCreados[Math.floor(Math.random() * reportantesCreados.length)];

    const diasAtras = Math.floor(Math.random() * 30);
    const fechaCreacion = new Date(Date.now() - (diasAtras * 24 * 60 * 60 * 1000));
    const estadoSimulado = Math.floor(Math.random() * 4) + 1;

    await incidenciasPrisma.incidencias.create({
      data: {
        id_incidencia: crypto.randomUUID(),
        id_activo: activo.id,
        id_reportante: idReportanteAleatorio,
        titulo: problema.t,
        descripcion: problema.d,
        fecha_creacion: fechaCreacion,
        historial_estados: {
          create: [
            { id_historial: crypto.randomUUID(), id_estado: 1, id_usuario_cambio: idReportanteAleatorio, fecha_creacion: fechaCreacion },
            ...(estadoSimulado > 1 ? [{
              id_historial: crypto.randomUUID(), id_estado: estadoSimulado, id_usuario_cambio: tecnicoResp,
              fecha_creacion: new Date(fechaCreacion.getTime() + (2 * 60 * 60 * 1000))
            }] : [])
          ]
        }
      }
    });
  }
  console.log('20 Incidencias interconectadas registradas a nombre de los Reportantes.');
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1); })
  .finally(async () => {
    await authPrisma.$disconnect();
    await activosPrisma.$disconnect();
    await incidenciasPrisma.$disconnect();
  });