import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IncidenciasModule } from '../incidencias/incidencias.module';
import { SincronizacionController } from './sincronizacion.controller';
import { SincronizacionService } from './sincronizacion.service';

@Module({
  imports: [PrismaModule, IncidenciasModule],
  controllers: [SincronizacionController],
  providers: [SincronizacionService],
})
export class SincronizacionModule {}
