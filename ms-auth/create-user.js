import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // 1. Crear el rol Administrador según la nueva tabla ROLES
  let rol = await prisma.role.findFirst();
  if (!rol) {
    rol = await prisma.role.create({
      data: { nombreRol: 'Administrador' } 
    });
  }

  // 2. Encriptar contraseña
  const hashedPassword = await argon2.hash('123456');

  // 3. Crear el usuario respetando las nuevas propiedades (passwordHash, roleId)
  const user = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      passwordHash: hashedPassword,
      nombre: 'Diego',
      apellido: 'Admin',
      rut_o_id: '19000000-0',
      roleId: rol.id 
    },
  });

  console.log('✅ Usuario creado con éxito en la BD:', user.email);
}

main()
  .catch((e) => console.error('❌ Error creando usuario:', e))
  .finally(async () => await prisma.$disconnect());