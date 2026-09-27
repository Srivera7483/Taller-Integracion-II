import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AsignarOrdenDto } from './dto/asignar-orden.dto';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';

type RequestWithUser = Request & {
  user?: { userId?: string; sub?: string; role?: string };
};

@Controller('ordenes-trabajo')
export class OrdenesTrabajoController {
  constructor(private readonly ordenesService: OrdenesTrabajoService) {}

  @Post('asignar')
  @HttpCode(HttpStatus.CREATED)
  async asignarOrden(
    @Body() body: AsignarOrdenDto,
    @Req() request: RequestWithUser,
  ) {
    const supervisorId =
      request.user?.userId ??
      request.user?.sub ??
      (request.user as any)?.id ??
      body.supervisor_id ??
      (request.headers['x-user-id'] as string) ??
      '00000000-0000-0000-0000-000000000001';

    return this.ordenesService.asignarOrden(body, supervisorId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async crearOrden(
    @Body() body: AsignarOrdenDto,
    @Req() request: RequestWithUser,
  ) {
    const supervisorId =
      request.user?.userId ??
      request.user?.sub ??
      (request.user as any)?.id ??
      body.supervisor_id ??
      (request.headers['x-user-id'] as string) ??
      '00000000-0000-0000-0000-000000000001';

    return this.ordenesService.asignarOrden(body, supervisorId);
  }


  @Get()
  async listarTodas() {
    return this.ordenesService.listarTodas();
  }

  @Get('tecnico/:tecnicoId')
  async listarPorTecnico(@Param('tecnicoId') tecnicoId: string) {
    return this.ordenesService.listarPorTecnico(tecnicoId);
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return this.ordenesService.obtenerPorId(id);
  }
}
