import { Module } from '@nestjs/common';
import { ActivosController } from './activos.controller';
import { ActivosService } from './activos.service';
import { PrismaService } from './prisma.service';
import { MantenimientosController } from './mantenimientos.controller';

@Module({
  imports: [],
  controllers: [ActivosController, MantenimientosController],
  providers: [ActivosService, PrismaService],
})
export class AppModule {}