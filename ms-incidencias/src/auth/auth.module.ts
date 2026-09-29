import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (config.get<string>('NODE_ENV') === 'production' && !secret) {
          throw new Error('JWT_SECRET es obligatorio en producción');
        }

        return {
          secret: secret ?? 'dev-secret-change-me',
          // ms-incidencias solo verifica tokens, no los crea. Esto es lo correcto.
          verifyOptions: { algorithms: ['HS256'] },
        };
      },
    }),
  ],
  providers: [JwtAuthGuard, RolesGuard],
  exports: [JwtModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
