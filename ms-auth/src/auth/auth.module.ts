import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
// Se deja por consideración, pero está definido Global
import { PrismaModule } from '../prisma/prisma.module.js';
import { UserRepository } from './user.repository.js';
import { AuditService } from './audit.service.js';
import { RolesGuard } from './roles.guard.js';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, UserRepository, AuditService],
})
export class AuthModule {}
