import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando la semilla de roles y usuarios (Modo Upsert con Argon2)...');

  // 1. Asegurar la existencia de los Roles
  const rolAdmin = await prisma.role.upsert({
    where: { nombreRol: 'Administrador' },
    update: {},
    create: { nombreRol: 'Administrador' },
  });
  console.log(`✅ Rol asegurado: ${rolAdmin.nombreRol}`);

  const rolTecnico = await prisma.role.upsert({
    where: { nombreRol: 'Técnico' },
    update: {},
    create: { nombreRol: 'Técnico' },
  });
  console.log(`✅ Rol asegurado: ${rolTecnico.nombreRol}`);

  const rolUsuario = await prisma.role.upsert({
    where: { nombreRol: 'Usuario' },
    update: {},
    create: { nombreRol: 'Usuario' },
  });
  console.log(`✅ Rol asegurado: ${rolUsuario.nombreRol}`);

  // Generamos el hash con argon2, igual que en tu script original
  const hashedPassword = await argon2.hash('password123'); // Puedes cambiarlo a '123456' si prefieres

  // 2. Crear los Usuarios
  const admin = await prisma.user.upsert({
    where: { rut_o_id: 'ADMIN-001' },
    update: { passwordHash: hashedPassword }, 
    create: {
      rut_o_id: 'ADMIN-001',
      nombre: 'Admin',
      apellido: 'Sistema',
      email: 'admin@empresa.com',
      passwordHash: hashedPassword,
      roleId: rolAdmin.id,
    },
  });
  console.log(`✅ Administrador asegurado: ${admin.rut_o_id}`);

  const tecnico = await prisma.user.upsert({
    where: { rut_o_id: 'TEC-001' },
    update: { passwordHash: hashedPassword },
    create: {
      rut_o_id: 'TEC-001',
      nombre: 'Juan',
      apellido: 'Técnico',
      email: 'tecnico@empresa.com',
      passwordHash: hashedPassword,
      roleId: rolTecnico.id,
    },
  });
  console.log(`✅ Técnico asegurado: ${tecnico.rut_o_id}`);

  const reportante = await prisma.user.upsert({
    where: { rut_o_id: 'USR-001' },
    update: { passwordHash: hashedPassword },
    create: {
      rut_o_id: 'USR-001',
      nombre: 'María',
      apellido: 'Reportante',
      email: 'usuario@empresa.com',
      passwordHash: hashedPassword,
      roleId: rolUsuario.id,
    },
  });
  console.log(`✅ Usuario asegurado: ${reportante.rut_o_id}`);

  console.log('🎉 Todos los perfiles listos para probar.');
}

main()
  .catch((e) => {
    console.error('Error creando usuarios:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });