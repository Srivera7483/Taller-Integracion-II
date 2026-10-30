import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
// Se deja por consideración, pero está definido Global
import { PrismaModule } from '../prisma/prisma.module.js';
import { UserRepository } from './user.repository.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') ?? 'super_secret_key_change_me',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRATION') ?? '1h') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, UserRepository],
})
export class AuthModule {}
