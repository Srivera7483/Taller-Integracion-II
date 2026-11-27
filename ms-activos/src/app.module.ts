import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ActivosController } from './activos.controller';
import { ActivosService } from './activos.service';
import { PrismaService } from './prisma.service';
import { MantenimientosController } from './mantenimientos.controller';
import { MantenimientosCron } from './mantenimientos.cron';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { PermissionsGuard } from './permissions.guard';

export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) {
    return secret;
  }
  if (process.env.NODE_ENV === 'test') {
    return 'test_jwt_secret_ms_activos';
  }
  throw new Error(
    '[Configuración Crítica] Falta definir JWT_SECRET en las variables de entorno de ms-activos.',
  );
}

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
    JwtModule.register({
      secret: resolveJwtSecret(),
    }),
  ],
  controllers: [ActivosController, MantenimientosController],
  providers: [ActivosService, PrismaService, MantenimientosCron, PermissionsGuard],
})
export class AppModule {}