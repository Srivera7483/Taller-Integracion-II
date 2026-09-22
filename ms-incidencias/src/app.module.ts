import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IncidenciasModule } from './incidencias/incidencias.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, IncidenciasModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
