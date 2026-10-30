const { PrismaClient: AuthPrisma } = require('./ms-auth/node_modules/@prisma/client');
const { PrismaClient: IncidenciasPrisma } = require('./ms-incidencias/node_modules/@prisma/client');
const argon2 = require('./ms-auth/node_modules/argon2');
const crypto = require('node:crypto');

const authPrisma = new AuthPrisma({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5435/auth_db',
    },
  },
});

const incidenciasPrisma = new IncidenciasPrisma({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres@localhost:5434/incidencias_db?schema=public',
    },
  },
});

async function main() {
  const rolAdmin = await authPrisma.role.upsert({
    where: { nombreRol: 'ADMINISTRADOR' },
    update: {},
    create: { nombreRol: 'ADMINISTRADOR' },
  });

  const rolTecnico = await authPrisma.role.upsert({
    where: { nombreRol: 'TECNICO' },
    update: {},
    create: { nombreRol: 'TECNICO' },
  });

  const rolUsuario = await authPrisma.role.upsert({
    where: { nombreRol: 'REPORTANTE' },
    update: {},
    create: { nombreRol: 'REPORTANTE' },
  });

  const hashedPassword = await argon2.hash('password123');

  const nombres = [
    'Carlos', 'Ana', 'Rodrigo', 'Valentina', 'Felipe',
    'Camila', 'Gonzalo', 'Daniela', 'Mauricio', 'Constanza',
    'Sebastian', 'Paula', 'Ignacio', 'Francisca', 'Diego',
    'Javiera', 'Alvaro', 'Patricia', 'Cristobal', 'Fernanda',
    'Esteban', 'Claudia', 'Maximiliano', 'Nicole', 'Andres',
    'Belen', 'Claudio', 'Macarena', 'Joaquin', 'Loreto',
    'Lucas', 'Baviera', 'Matias', 'Catalina', 'Victor',
    'Pamela', 'Alejandro', 'Gloria', 'Gabriel', 'Soledad'
  ];

  const apellidos = [
    'Gonzalez', 'Rodriguez', 'Perez', 'Muñoz', 'Rojas',
    'Silva', 'Morales', 'Diaz', 'Castro', 'Araya',
    'Vergara', 'Sepulveda', 'Flores', 'Sanhueza', 'Espinoza',
    'Valenzuela', 'Castillo', 'Tapia', 'Reyes', 'Gutierrez',
    'Pizarro', 'Carrasco', 'Navarro', 'Cortes', 'Torres',
    'Contreras', 'Bravo', 'Fuentes', 'Soto', 'Vega',
    'Vargas', 'Riquelme', 'Paredes', 'Herrera', 'Sandoval',
    'Leon', 'Guerrero', 'Mendoza', 'Pena', 'Cardenas'
  ];

  const rolesDisponibles = [rolTecnico.id, rolUsuario.id, rolAdmin.id];
  const usuariosCreados = [];

  for (let i = 0; i < 40; i++) {
    const rut = `TEST-${100 + i}`;
    const nombre = nombres[i % nombres.length];
    const apellido = apellidos[i % apellidos.length];
    const email = `usuario.prueba.${i + 1}@empresa.com`;
    const roleId = rolesDisponibles[i % rolesDisponibles.length];
    const fecha = new Date(Date.now() - (40 - i) * 3600000 * 24);

    const user = await authPrisma.user.upsert({
      where: { rut_o_id: rut },
      update: {},
      create: {
        rut_o_id: rut,
        nombre,
        apellido,
        email,
        passwordHash: hashedPassword,
        roleId,
        fechaCreacion: fecha,
      },
    });
    usuariosCreados.push(user);
  }

  const estadosBase = [
    { id_estado: 1, nombre_estado: 'Reportada' },
    { id_estado: 2, nombre_estado: 'Asignada' },
    { id_estado: 3, nombre_estado: 'Resuelta' },
    { id_estado: 4, nombre_estado: 'Cerrada' },
    { id_estado: 5, nombre_estado: 'Rechazada' },
    { id_estado: 6, nombre_estado: 'Completada' },
  ];

  for (const eb of estadosBase) {
    await incidenciasPrisma.estadoIncidencia.upsert({
      where: { id_estado: eb.id_estado },
      update: { nombre_estado: eb.nombre_estado },
      create: eb,
    });
  }

  const titulos = [
    'Proyector no enciende en auditorio',
    'Falla de conexión red cableada piso 3',
    'Impresora multifuncional atascada',
    'Servidor de archivos responde lento',
    'Pantalla rota en terminal de recepción',
    'Fuga eléctrica menor en rack secundario',
    'Router wifi sin acceso a internet',
    'Mouse óptico defectuoso laboratorio 2',
    'Teclado no responde sala de reuniones',
    'Error de disco duro en equipo contabilidad',
    'Actualización bloqueada en equipo docente',
    'Sensor de temperatura sala TI disparado',
    'Switch core no responde peticiones SNMP',
    'Cámara de seguridad desconectada acceso norte',
    'Problema en fuente de poder estación CAD',
    'Cable de red dañado en estación de trabajo',
    'Monitor parpadea constantemente en secretaría',
    'Pérdida de paquetes en enlace edificio central',
    'Lector código QR no realiza lecturas',
    'Licencia de software operativo expirada'
  ];

  const reportanteId = crypto.randomUUID();

  for (let i = 0; i < 40; i++) {
    const idIncidencia = crypto.randomUUID();
    const idActivo = crypto.randomUUID();
    const titulo = `${titulos[i % titulos.length]} #${i + 1}`;
    const descripcion = `Incidencia de prueba generada automáticamente número ${i + 1} para evaluación de scroll infinito y rendimiento.`;
    const fechaCreacion = new Date(Date.now() - (40 - i) * 1800000 * 5);
    const estadoId = (i % 4) + 1;

    await incidenciasPrisma.incidencias.create({
      data: {
        id_incidencia: idIncidencia,
        id_activo: idActivo,
        id_reportante: reportanteId,
        titulo,
        descripcion,
        fecha_creacion: fechaCreacion,
        historial_estados: {
          create: {
            id_historial: crypto.randomUUID(),
            id_estado: estadoId,
            id_usuario_cambio: reportanteId,
            fecha_creacion: fechaCreacion,
          },
        },
      },
    });
  }

  console.log('Se sembraron 40 usuarios y 40 incidencias exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await authPrisma.$disconnect();
    await incidenciasPrisma.$disconnect();
  });
