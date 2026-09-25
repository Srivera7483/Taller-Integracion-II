import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ReportanteGuard } from './reportante.guard';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
    }),
  ],
  providers: [JwtAuthGuard, ReportanteGuard],
  exports: [JwtModule, JwtAuthGuard, ReportanteGuard],
})
export class AuthModule {}