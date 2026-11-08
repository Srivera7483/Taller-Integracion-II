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


@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'super_secret_key_change_me',
    }),
  ],
  controllers: [ActivosController, MantenimientosController],
  providers: [ActivosService, PrismaService, MantenimientosCron, PermissionsGuard],
})
export class AppModule {}