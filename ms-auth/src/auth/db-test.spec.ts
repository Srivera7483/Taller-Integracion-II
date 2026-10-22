import { describe, it, expect, afterAll } from 'vitest';
import { hash } from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserRepository } from './user.repository.js';

describe.runIf(Boolean(process.env.DATABASE_URL))('Prueba de Conexión Real BD', () => {
  const prisma = new PrismaService();
  const repo = new UserRepository(prisma);
  const testEmail = 'tal-125-integration@empresa.com';
  const testRoleName = 'TAL-125-INTEGRATION';

  it('debe crear un usuario con su rol y leerlo mediante UserRepository', async () => {
    const hashedPassword = await hash('admin123');

    const role = await prisma.role.upsert({
      where: { nombreRol: testRoleName },
      update: {},
      create: { nombreRol: testRoleName },
    });

    const createdUser = await prisma.user.upsert({
      where: { email: testEmail },
      update: {
        passwordHash: hashedPassword,
        roleId: role.id,
      },
      create: {
        rut_o_id: 'TAL-125-INTEGRATION',
        nombre: 'Usuario',
        apellido: 'Integración',
        email: testEmail,
        passwordHash: hashedPassword,
        roleId: role.id,
      },
    });

    const foundUser = await repo.findByEmail(testEmail);

    expect(foundUser).not.toBeNull();
    expect(foundUser?.email).toBe(testEmail);
    expect(foundUser?.role.nombreRol).toBe(testRoleName);
    expect(createdUser.id).toBe(foundUser?.id);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testEmail } });
    await prisma.role.deleteMany({ where: { nombreRol: testRoleName } });
    await prisma.$disconnect();
  });
});