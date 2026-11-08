const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const permissions = [
  ['incidencias:crear', 'Crear incidencias'],
  ['incidencias:ver', 'Ver incidencias'],
  ['incidencias:resolver', 'Resolver incidencias'],
  ['incidencias:clasificar_prioridad', 'Clasificar la prioridad de incidencias'],
  ['evidencias:subir', 'Subir evidencias'],
  ['ordenes:asignar', 'Asignar ordenes de trabajo'],
  ['ordenes:diagnosticar', 'Diagnosticar ordenes de trabajo'],
  ['activos:gestionar', 'Gestionar activos'],
  ['mantenimientos:crear', 'Crear mantenimientos'],
  ['estadisticas:ver', 'Ver estadisticas'],
  ['usuarios:gestionar', 'Gestionar usuarios'],
];

const rolePermissions = {
  REPORTANTE: ['incidencias:crear', 'incidencias:ver', 'evidencias:subir'],
  TECNICO: [
    'incidencias:ver',
    'incidencias:resolver',
    'evidencias:subir',
    'ordenes:diagnosticar',
    'mantenimientos:crear',
  ],
  SUPERVISOR: [
    'incidencias:ver',
    'incidencias:resolver',
    'incidencias:clasificar_prioridad',
    'evidencias:subir',
    'ordenes:asignar',
    'ordenes:diagnosticar',
    'activos:gestionar',
    'mantenimientos:crear',
    'estadisticas:ver',
  ],
  ADMINISTRADOR: permissions.map(([name]) => name),
};


async function asegurarIndicePermisos() {
  console.log('Verificando índice único de permisos...');

  const duplicados = await prisma.$queryRaw`
    SELECT nombre_permiso, COUNT(*)::int AS cantidad
    FROM public."PERMISOS"
    GROUP BY nombre_permiso
    HAVING COUNT(*) > 1
  `;

  if (duplicados.length > 0) {
    throw new Error(
      'No se puede crear el índice único: existen nombres de permisos duplicados.',
    );
  }

  await prisma.$executeRaw`
    CREATE UNIQUE INDEX IF NOT EXISTS "PERMISOS_nombre_permiso_key"
    ON public."PERMISOS" ("nombre_permiso")
  `;

  console.log('Índice único de permisos verificado.');
}


async function main() {
  await asegurarIndicePermisos();

  for (const [nombrePermiso, descripcion] of permissions) {
    await prisma.permiso.upsert({
      where: { nombrePermiso },
      update: { descripcion },
      create: { nombrePermiso, descripcion },
    });
  }

  for (const [roleName, rolePermissionNames] of Object.entries(rolePermissions)) {
    const role = await prisma.role.upsert({
      where: { nombreRol: roleName },
      update: {},
      create: { nombreRol: roleName },
    });

    await prisma.rolePermiso.deleteMany({ where: { roleId: role.id } });
    for (const permissionName of rolePermissionNames) {
      const permission = await prisma.permiso.findUnique({
        where: { nombrePermiso: permissionName },
      });
      await prisma.rolePermiso.create({
        data: { roleId: role.id, permisoId: permission.id },
      });
    }
  }

  console.log('Catalogo de permisos y ROLES_PERMISOS creado correctamente.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
