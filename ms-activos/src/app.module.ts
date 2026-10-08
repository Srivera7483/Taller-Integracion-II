import { Module } from '@nestjs/common';
import { ActivosController } from './activos.controller';
import { ActivosService } from './activos.service';

@Module({
  imports: [],
  controllers: [ActivosController],
  providers: [ActivosService, PrismaService],
})
export class AppModule {}