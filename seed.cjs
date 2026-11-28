const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PrismaClient: AuthPrisma } = require('./ms-auth/node_modules/@prisma/client');
const { PrismaClient: ActivosPrisma } = require('./ms-activos/node_modules/@prisma/client');
const { PrismaClient: IncidenciasPrisma } = require('./ms-incidencias/node_modules/@prisma/client');
const argon2 = require('./ms-auth/node_modules/argon2');

/**
 * Parsea un archivo .env local sin depender de paquetes externos en la raíz.
 */
function leerArchivoEnv(rutaRelativa) {
  const rutaAbsoluta = path.join(__dirname, rutaRelativa);
  if (!fs.existsSync(rutaAbsoluta)) {
    return {};
  }
  const resultado = {};
  const contenido = fs.readFileSync(rutaAbsoluta, 'utf8').replace(/^\uFEFF/, '');
  for (const lineaCruda of contenido.split(/\r?\n/)) {
    const linea = lineaCruda.trim();
    if (!linea || linea.startsWith('#')) continue;
    const indiceIgual = linea.indexOf('=');
    if (indiceIgual <= 0) continue;
    const clave = linea.slice(0, indiceIgual).trim();
    let valor = linea.slice(indiceIgual + 1).trim();
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1);
    }
    resultado[clave] = valor;
  }
  return resultado;
}

const envRaiz = leerArchivoEnv('.env');
const envAuth = leerArchivoEnv(path.join('ms-auth', '.env'));
const envActivos = leerArchivoEnv(path.join('ms-activos', '.env'));
const envIncidencias = leerArchivoEnv(path.join('ms-incidencias', '.env'));

// 1. Candado estricto anti-producción: evita borrado destructivo e inyección de cuentas de desarrollo
const entornoActual = String(process.env.NODE_ENV || envRaiz.NODE_ENV || 'development')
  .trim()
  .toLowerCase();

if (entornoActual === 'production') {
  console.error(
    '[SEGURIDAD] Ejecución abortada: seed.cjs contiene datos de desarrollo y operaciones destructivas (deleteMany), por lo que está estrictamente prohibido cuando NODE_ENV=production.',
  );
  process.exit(1);
}

// 2. Resolución de conexiones exclusivamente desde variables de entorno (.env ignorados en Git)
const authDbUrl = process.env.AUTH_DATABASE_URL || envRaiz.AUTH_DATABASE_URL || envAuth.DATABASE_URL;
const activosDbUrl =
  process.env.ACTIVOS_DATABASE_URL || envRaiz.ACTIVOS_DATABASE_URL || envActivos.DATABASE_URL;
const incidenciasDbUrl =
  process.env.INCIDENCIAS_DATABASE_URL ||
  envRaiz.INCIDENCIAS_DATABASE_URL ||
  envIncidencias.DATABASE_URL;

const urlsFaltantes = [
  !authDbUrl || authDbUrl.includes('username:password') ? 'ms-auth/.env (DATABASE_URL)' : null,
  !activosDbUrl || activosDbUrl.includes('username:password') ? 'ms-activos/.env (DATABASE_URL)' : null,
  !incidenciasDbUrl || incidenciasDbUrl.includes('username:password')
    ? 'ms-incidencias/.env (DATABASE_URL)'
    : null,
].filter(Boolean);

if (urlsFaltantes.length > 0) {
  console.error(
    `[SEGURIDAD] Faltan URLs de conexión válidas o siguen con placeholders en: ${urlsFaltantes.join(', ')}.`,
  );
  process.exit(1);
}

// 3. Resolución de contraseña local desde variable de entorno (sin contraseñas en duro en el repositorio)
const seedPassword = String(
  process.env.SEED_DEFAULT_PASSWORD || envRaiz.SEED_DEFAULT_PASSWORD || '',
).trim();

if (!seedPassword || seedPassword.length < 8) {
  console.error(
    '[SEGURIDAD] SEED_DEFAULT_PASSWORD no está definida (o tiene menos de 8 caracteres) en el archivo .env raíz. Ejecuta .\\start.ps1 para autogenerar una contraseña local segura o configúrala manualmente en tu .env.',
  );
  process.exit(1);
}

// 4. Carga desacoplada de usuarios desde seed.local.json (ignorado por Git) o plantilla ficticia seed.example.json
function cargarUsuariosSeed() {
  const rutaLocal = path.join(__dirname, 'seed.local.json');
  const rutaEjemplo = path.join(__dirname, 'seed.example.json');
  const rutaSeleccionada = fs.existsSync(rutaLocal) ? rutaLocal : rutaEjemplo;

  if (!fs.existsSync(rutaSeleccionada)) {
    throw new Error(
      'No se encontró seed.local.json ni seed.example.json para poblar los usuarios de desarrollo.',
    );
  }

  if (rutaSeleccionada === rutaEjemplo) {
    console.log(
      '[AVISO] seed.local.json no detectado; cargando cuentas ficticias desde seed.example.json.',
    );
  } else {
    console.log('[OK] Cargando cuentas locales desde seed.local.json (no versionado en Git).');
  }

  const parsed = JSON.parse(fs.readFileSync(rutaSeleccionada, 'utf8').replace(/^\uFEFF/, ''));
  if (!parsed || !Array.isArray(parsed.usuarios) || parsed.usuarios.length === 0) {
    throw new Error('El archivo JSON de seed debe incluir un arreglo "usuarios" no vacío.');
  }
  return parsed.usuarios;
}

const authPrisma = new AuthPrisma({ datasources: { db: { url: authDbUrl } } });
const activosPrisma = new ActivosPrisma({ datasources: { db: { url: activosDbUrl } } });
const incidenciasPrisma = new IncidenciasPrisma({ datasources: { db: { url: incidenciasDbUrl } } });

async function main() {
  console.log('Iniciando carga segura de datos de desarrollo...');

  // ==========================================
  // 1. ROLES Y USUARIOS
  // ==========================================
  const rolAdmin = await authPrisma.role.upsert({
    where: { nombreRol: 'ADMINISTRADOR' },
    update: {},
    create: { nombreRol: 'ADMINISTRADOR' },
  });
  const rolSupervisor = await authPrisma.role.upsert({
    where: { nombreRol: 'SUPERVISOR' },
    update: {},
    create: { nombreRol: 'SUPERVISOR' },
  });
  const rolTecnico = await authPrisma.role.upsert({
    where: { nombreRol: 'TECNICO' },
    update: {},
    create: { nombreRol: 'TECNICO' },
  });
  const rolReportante = await authPrisma.role.upsert({
    where: { nombreRol: 'REPORTANTE' },
    update: {},
    create: { nombreRol: 'REPORTANTE' },
  });

  const mapaRoles = {
    ADMINISTRADOR: rolAdmin.id,
    SUPERVISOR: rolSupervisor.id,
    TECNICO: rolTecnico.id,
    REPORTANTE: rolReportante.id,
  };

  const usuariosConfig = cargarUsuariosSeed();
  const hash = await argon2.hash(seedPassword);

  const tecnicosCreados = [];
  const reportantesCreados = [];

  for (const u of usuariosConfig) {
    const rolNormalizado = String(u.rol || '').trim().toUpperCase();
    const roleId = mapaRoles[rolNormalizado];
    if (!roleId) {
      throw new Error(
        `Rol inválido "${u.rol}" para el usuario "${u.email}". Roles válidos: ${Object.keys(mapaRoles).join(', ')}.`,
      );
    }

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
          roleId,
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
          roleId,
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
          roleId,
        },
      });
    }

    if (roleId === rolTecnico.id) tecnicosCreados.push(user.id || user.userId);
    if (roleId === rolReportante.id) reportantesCreados.push(user.id || user.userId);
  }

  if (tecnicosCreados.length === 0 || reportantesCreados.length === 0) {
    throw new Error(
      'El archivo de usuarios del seed debe incluir al menos 1 usuario TECNICO y 1 usuario REPORTANTE.',
    );
  }

  console.log(`Usuarios sincronizados correctamente (${usuariosConfig.length} cuentas).`);

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
    { id: crypto.randomUUID(), qr: 'UCT-SW-01', nombre: 'Switch Cisco Catalyst', cat: 'REDES', mod: 'Catalyst 9200', ubi: 'Sala de Servidores' },
  ];

  const activosCreados = [];
  for (const act of activosData) {
    const nuevoActivo = await activosPrisma.activo.create({
      data: {
        id: act.id,
        codigoQr: act.qr,
        nombre: act.nombre,
        categoria: act.cat,
        modelo: act.mod,
        numeroSerie: `SN-${act.qr}`,
        ubicacion: act.ubi,
        estado: 'OPERATIVO',
      },
    });
    activosCreados.push(nuevoActivo);
  }
  console.log('Activos de inventario creados.');

  const fechaHoy = new Date();

  const mantenimientosBase = [
    { id_activo: activosCreados[0].id, dias: 5 },
    { id_activo: activosCreados[7].id, dias: 12 },
    { id_activo: activosCreados[4].id, dias: 1 },
  ];

  for (const mant of mantenimientosBase) {
    await activosPrisma.mantenimiento.create({
      data: {
        id_mantenimiento: crypto.randomUUID(),
        id_activo: mant.id_activo,
        fecha_programada: new Date(fechaHoy.getTime() + mant.dias * 24 * 60 * 60 * 1000),
        fecha_creacion: fechaHoy,
      },
    });
  }
  console.log(`${mantenimientosBase.length} Mantenimientos preventivos programados.`);

  // ==========================================
  // 3. ESTADOS E INCIDENCIAS (4 estados oficiales: Reportada, Asignada, Resuelta, Rechazada)
  // ==========================================
  const estadosBase = [
    { id_estado: 1, nombre_estado: 'Reportada' },
    { id_estado: 2, nombre_estado: 'Asignada' },
    { id_estado: 3, nombre_estado: 'Resuelta' },
    { id_estado: 5, nombre_estado: 'Rechazada' },
  ];
  for (const eb of estadosBase) {
    await incidenciasPrisma.estadoIncidencia.upsert({
      where: { id_estado: eb.id_estado },
      update: { nombre_estado: eb.nombre_estado },
      create: eb,
    });
  }

  await incidenciasPrisma.evidencia.deleteMany();
  await incidenciasPrisma.ordenTrabajo.deleteMany();
  await incidenciasPrisma.historialEstados.deleteMany();
  await incidenciasPrisma.incidencias.deleteMany();
  await incidenciasPrisma.estadoIncidencia.deleteMany({
    where: { id_estado: { in: [4, 6] } },
  });

  const problemasEscolares = [
    { t: 'Proyector con imagen amarillenta', d: 'La lámpara del proyector parece estar agotándose.', prio: 'media' },
    { t: 'Computador no da video', d: 'El equipo enciende pero el monitor dice "No Signal".', prio: 'alta' },
    { t: 'Switch parpadea en rojo', d: 'El puerto 14 del switch core de la sala de servidores marca colisión constante.', prio: 'critica' },
    { t: 'Equipo extremadamente lento', d: 'Al abrir software pesado, el equipo se congela por completo.', prio: 'baja' },
  ];

  const cicloEstadosDemo = [1, 2, 3, 3, 5];

  for (let i = 0; i < 20; i++) {
    const activo = activosCreados[i % activosCreados.length];
    const problema = problemasEscolares[i % problemasEscolares.length];
    const tecnicoResp = tecnicosCreados[i % tecnicosCreados.length];
    const idReportanteAleatorio = reportantesCreados[i % reportantesCreados.length];

    const diasAtras = (i % 15) + 1;
    const fechaCreacion = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000);
    // Distribuir entre los 4 estados oficiales (1: Reportada, 2: Asignada, 3: Resuelta, 5: Rechazada)
    const estadoSimulado = cicloEstadosDemo[i % cicloEstadosDemo.length];
    const fechaOrden = new Date(fechaCreacion.getTime() + 60 * 60 * 1000);
    const fechaCierre = new Date(fechaCreacion.getTime() + 3 * 60 * 60 * 1000);

    const requiereOrden = estadoSimulado >= 2;
    const diagnosticoSemilla =
      estadoSimulado === 5
        ? 'Incidencia desestimada tras inspección en terreno: el cable HDMI del docente estaba desconectado y el equipo UCT opera dentro de parámetros normales.'
        : estadoSimulado === 3
          ? 'Se realizó limpieza preventiva de contactos, ajuste de parámetros y pruebas de estrés satisfactorias.'
          : null;

    await incidenciasPrisma.incidencias.create({
      data: {
        id_incidencia: crypto.randomUUID(),
        id_activo: activo.id,
        id_reportante: idReportanteAleatorio,
        titulo: problema.t,
        descripcion: problema.d,
        prioridad: problema.prio,
        fecha_creacion: fechaCreacion,
        historial_estados: {
          create: [
            {
              id_historial: crypto.randomUUID(),
              id_estado: 1,
              id_usuario_cambio: idReportanteAleatorio,
              fecha_creacion: fechaCreacion,
            },
            ...(estadoSimulado >= 2
              ? [
                  {
                    id_historial: crypto.randomUUID(),
                    id_estado: 2,
                    id_usuario_cambio: tecnicoResp,
                    fecha_creacion: fechaOrden,
                  },
                ]
              : []),
            ...(estadoSimulado === 3 || estadoSimulado === 5
              ? [
                  {
                    id_historial: crypto.randomUUID(),
                    id_estado: estadoSimulado,
                    id_usuario_cambio: tecnicoResp,
                    fecha_creacion: fechaCierre,
                  },
                ]
              : []),
          ],
        },
        ...(requiereOrden
          ? {
              ordenes_trabajo: {
                create: [
                  {
                    id_orden: crypto.randomUUID(),
                    id_tecnico: tecnicoResp,
                    diagnostico_tecnico: diagnosticoSemilla,
                    fecha_creacion: fechaOrden,
                    fecha_cierre: estadoSimulado === 3 || estadoSimulado === 5 ? fechaCierre : null,
                  },
                ],
              },
            }
          : {}),
      },
    });
  }
  console.log('20 Incidencias interconectadas registradas a nombre de los Reportantes.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await authPrisma.$disconnect();
    await activosPrisma.$disconnect();
    await incidenciasPrisma.$disconnect();
  });
