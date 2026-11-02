import { Module } from '@nestjs/common';
import { ActivosController } from './activos.controller';
import { ActivosService } from './activos.service';
import { PrismaService } from './prisma.service';
import { MantenimientosController } from './mantenimientos.controller';
import { MantenimientosCron } from './mantenimientos.cron';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';


@Module({
  imports: [ScheduleModule.forRoot(), HttpModule],
  controllers: [ActivosController, MantenimientosController],
  providers: [ActivosService, PrismaService, MantenimientosCron],
})
export class AppModule {}