import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { hash } from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let passwordHash: string;
  const testUser = {
    id: 'user-123',
    email: 'admin@test.com',
    rut_o_id: 'TEST-001',
    nombre: 'Admin',
    apellido: 'Pruebas',
    fechaCreacion: new Date('2026-01-01T00:00:00.000Z'),
    fechaEliminacion: null,
    role: { id: 1, nombreRol: 'Administrador' },
  };

  beforeAll(async () => {
    passwordHash = await hash('pass123', { timeCost: 1, memoryCost: 4096 });
    process.env.JWT_SECRET = 'e2e-access-secret';
    process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret';
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: vi.fn(),
        $disconnect: vi.fn(),
        user: {
          findUnique: vi.fn().mockImplementation(async () => ({
            ...testUser,
            passwordHash,
          })),
        },
        auditLog: {
          create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
          findMany: vi.fn().mockResolvedValue([]),
          count: vi.fn().mockResolvedValue(0),
        },
        $transaction: vi.fn().mockResolvedValue([[], 0]),
      })
      .compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('POST /auth/login devuelve access token y establece refresh cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'pass123' })
      .expect(200);

    expect(response.body).toMatchObject({
      token: expect.any(String),
      usuario: { id_usuario: 'user-123' },
    });
    expect(response.body).not.toHaveProperty('refreshToken');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');

    const payload = app.get(JwtService).verify(response.body.token);
    expect(payload).toMatchObject({
      userId: 'user-123',
      role: 'Administrador',
      tokenUse: 'access',
    });
    expect(payload).not.toHaveProperty('password');
  });

  it('GET /auth/me responde 401 sin token, con token invalido y expirado', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    const expiredToken = app
      .get(JwtService)
      .sign({ userId: 'user-123', role: 'admin' }, { expiresIn: -1 });

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('GET /auth/me inyecta userId y role cuando el token es valido', async () => {
    const token = app
      .get(JwtService)
      .sign({ userId: 'user-123', role: 'admin' });

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        id_usuario: 'user-123',
        rut_o_id: 'TEST-001',
        nombre: 'Admin',
        apellido: 'Pruebas',
        correo: 'admin@test.com',
        rol: { id_rol: 1, nombre_rol: 'Administrador' },
        created_at: '2026-01-01T00:00:00.000Z',
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
