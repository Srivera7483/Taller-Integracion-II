import { describe, it, expect, afterAll } from 'vitest';
import { hash } from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRepository } from './user.repository.js';

describe('Prueba de Conexión Real BD', () => {
  const prisma = new PrismaService();
  const repo = new UserRepository(prisma);

  it('debe crear un usuario con su rol y leerlo mediante UserRepository', async () => {
    const testEmail = 'admin-test@empresa.com';
    const hashedPassword = await hash('admin123');

    // 1. Asegurar que exista el Rol ADMINISTRADOR
    const role = await prisma.role.upsert({
      where: { name: 'ADMINISTRADOR' },
      update: {},
      create: {
        name: 'ADMINISTRADOR',
        description: 'Rol de prueba para integración',
      },
    });

    // 2. Crear o actualizar el Usuario de prueba
    const createdUser = await prisma.user.upsert({
      where: { email: testEmail },
      update: {
        password: hashedPassword,
        roleId: role.id,
      },
      create: {
        email: testEmail,
        password: hashedPassword,
        name: 'Admin Pruebas',
        roleId: role.id,
      },
    });

    console.log('Usuario insertado/existente en BD:', createdUser);

    // 3. Probar la lectura real usando el UserRepository
    const foundUser = await repo.findByEmail(testEmail);
    console.log('Usuario leído mediante UserRepository:', foundUser);

    expect(foundUser).not.toBeNull();
    expect(foundUser?.email).toBe(testEmail);
    expect(foundUser?.role.name).toBe('ADMINISTRADOR');
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});