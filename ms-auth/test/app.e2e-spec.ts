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

  beforeAll(async () => {
    passwordHash = await hash('pass123', { timeCost: 1, memoryCost: 4096 });
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
          findUnique: vi.fn().mockResolvedValue({
            id: 'user-123',
            password: passwordHash,
            role: { name: 'admin' },
          }),
        },
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

  it('POST /auth/login responde 200 y devuelve un JWT con userId y role', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'pass123' })
      .expect(200);

    expect(response.body).toEqual({ accessToken: expect.any(String) });

    const payload = app.get(JwtService).verify(response.body.accessToken);
    expect(payload).toMatchObject({ userId: 'user-123', role: 'admin' });
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
      .expect({ userId: 'user-123', role: 'admin' });
  });

  afterEach(async () => {
    await app.close();
  });
});
