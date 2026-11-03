import { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { hash } from 'argon2';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { UserRepository } from './user.repository.js';

const jwtSecret = 'test-access-secret';
const refreshSecret = 'test-refresh-secret';

describe('Auth refresh flow (e2e)', () => {
  let app: INestApplication<App>;
  let passwordHash: string;
  let user: {
    id: string;
    email: string;
    passwordHash: string;
    rut_o_id: string;
    nombre: string;
    apellido: string;
    fechaCreacion: Date;
    fechaEliminacion: Date | null;
    role: { id: number; nombreRol: string };
  };

  const userRepository = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    updateRole: vi.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret;
    process.env.JWT_REFRESH_SECRET = refreshSecret;
    passwordHash = await hash('pass123', { timeCost: 1, memoryCost: 4096 });
  });

  beforeEach(async () => {
    user = {
      id: 'user-123',
      email: 'admin@test.com',
      passwordHash,
      rut_o_id: '12345678-9',
      nombre: 'Admin',
      apellido: 'Test',
      fechaCreacion: new Date(),
      fechaEliminacion: null,
      role: { id: 1, nombreRol: 'ADMINISTRADOR' },
    };
    userRepository.findByEmail.mockImplementation(async () => user);
    userRepository.findById.mockImplementation(async () => user);

    const moduleFixture = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: jwtSecret,
          signOptions: { expiresIn: '15m' },
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtAuthGuard,
        RolesGuard,
        { provide: UserRepository, useValue: userRepository },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<App>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
    vi.clearAllMocks();
  });

  it('completa login y refresh por HTTP, mantiene el refresh en cookie y emite access token corto', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'pass123' })
      .expect(200);

    expect(loginResponse.body).toMatchObject({
      token: expect.any(String),
      usuario: { id_usuario: user.id },
    });
    expect(loginResponse.body).not.toHaveProperty('refreshToken');

    const setCookie = loginResponse.headers['set-cookie'] as string[];
    expect(setCookie[0]).toContain('refresh_token=');
    expect(setCookie[0]).toContain('HttpOnly');
    expect(setCookie[0]).toContain('SameSite=Strict');

    const refreshToken = setCookie[0].match(/refresh_token=([^;]+)/)?.[1];
    expect(refreshToken).toBeTruthy();

    const refreshPayload = app
      .get(JwtService)
      .verify(refreshToken!, { secret: refreshSecret });
    expect(refreshPayload).toMatchObject({
      sub: user.id,
      tokenUse: 'refresh',
    });
    expect(refreshPayload.exp - refreshPayload.iat).toBe(7 * 24 * 60 * 60);

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refresh_token=${refreshToken}`)
      .expect(200);

    expect(refreshResponse.body).toEqual({
      accessToken: expect.any(String),
    });
    const accessPayload = app.get(JwtService).verify(
      refreshResponse.body.accessToken,
    );
    expect(accessPayload).toMatchObject({
      sub: user.id,
      tokenUse: 'access',
    });
    expect(accessPayload.exp - accessPayload.iat).toBe(15 * 60);
  });

  it('rechaza un refresh token manipulado con HTTP 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set(
        'Cookie',
        'refresh_token=eyJhbGciOiJIUzI1NiJ9.manipulado.firma-invalida',
      )
      .expect(401);
  });

  it('rechaza un refresh token expirado con HTTP 401', async () => {
    const expiredRefreshToken = app.get(JwtService).sign(
      { sub: user.id, tokenUse: 'refresh' },
      { secret: refreshSecret, expiresIn: -1 },
    );

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refresh_token=${expiredRefreshToken}`)
      .expect(401);
  });

  it('rechaza el refresh si la cuenta fue eliminada', async () => {
    const refreshToken = app.get(JwtService).sign(
      { sub: user.id, tokenUse: 'refresh' },
      { secret: refreshSecret, expiresIn: '7d' },
    );
    user.fechaEliminacion = new Date();

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `refresh_token=${refreshToken}`)
      .expect(401);
  });
});
