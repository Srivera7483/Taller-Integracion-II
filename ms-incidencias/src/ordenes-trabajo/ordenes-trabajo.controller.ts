import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { ActualizarDiagnosticoDto } from '../incidencias/dto/actualizar-diagnostico.dto';
import { CrearOrdenTrabajoDto } from './dto/crear-orden-trabajo.dto';
import { ListarOrdenesTrabajoQueryDto } from './dto/listar-ordenes-trabajo-query.dto';
import { OrdenesTrabajoService } from './ordenes-trabajo.service';

@Controller('ordenes-trabajo')
export class OrdenesTrabajoController {
  constructor(private readonly ordenesService: OrdenesTrabajoService) {}

  @Get()
  listar(@Query() query: ListarOrdenesTrabajoQueryDto) {
    return this.ordenesService.listar(query);
  }

  @Post()
  @Roles('SUPERVISOR')
  crear(@Body() body: CrearOrdenTrabajoDto) {
    return this.ordenesService.crear(body);
  }

  @Get(':id_orden')
  obtener(@Param('id_orden', ParseUUIDPipe) id: string) {
    return this.ordenesService.obtener(id);
  }

  @Patch(':id_orden/diagnostico')
  @Roles('TECNICO')
  actualizarDiagnostico(
    @Param('id_orden', ParseUUIDPipe) id: string,
    @Body() body: ActualizarDiagnosticoDto,
    @CurrentUser() usuario: AuthenticatedUser,
  ) {
    return this.ordenesService.actualizarDiagnostico(id, body, usuario);
  }
}
