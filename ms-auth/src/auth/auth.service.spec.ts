import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { verify } from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';

vi.mock('argon2', () => ({
  verify: vi.fn(),
}));

describe('AuthService', () => {
  it('should return a JWT for a valid user and role', async () => {
    vi.mocked(verify).mockResolvedValue(true);

    const prisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-123',
          password: '$argon2id$v=19$m=65536,t=3,p=4$test-hash',
          role: { name: 'admin' },
        }),
      },
    };

    const jwt: any = {
      sign: vi.fn().mockReturnValue('signed-token'),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    const service = moduleRef.get(AuthService);
    const result = await service.login({ email: 'admin@test.com', password: 'pass123' });

    expect(verify).toHaveBeenCalledWith(
      '$argon2id$v=19$m=65536,t=3,p=4$test-hash',
      'pass123',
    );
    expect(jwt.sign).toHaveBeenCalledWith({ userId: 'user-123', role: 'admin' });
    expect(result).toEqual({ accessToken: 'signed-token' });
  });

  it('should throw UnauthorizedException when credentials are invalid', async () => {
    vi.mocked(verify).mockResolvedValue(false);

    const prisma: any = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'user-123',
          password: '$argon2id$v=19$m=65536,t=3,p=4$test-hash',
          role: { name: 'user' },
        }),
      },
    };

    const jwt: any = {
      sign: vi.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    const service = moduleRef.get(AuthService);

    await expect(
      service.login({ email: 'admin@test.com', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(jwt.sign).not.toHaveBeenCalled();
  });
});
