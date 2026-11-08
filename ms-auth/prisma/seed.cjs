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

async function main() {
  for (const [nombrePermiso, descripcion] of permissions) {
    await prisma.permiso.upsert({
      where: { nombrePermiso },
      update: { descripcion },
      create: { nombrePermiso, descripcion },
    });
  }

  for (const [roleName, rolePermissionNames] of Object.entries(rolePermissions)) {
    const role = await prisma.role.findUnique({ where: { nombreRol: roleName } });
    if (!role) throw new Error(`Rol requerido no encontrado: ${roleName}`);

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
