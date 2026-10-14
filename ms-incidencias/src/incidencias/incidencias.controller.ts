import {
  Body,
  Controller,
  Get,
  HttpStatus,
  UnauthorizedException,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import type { JwtUser } from '../auth/auth.types';
import { CrearEvidenciaDto } from './dto/crear-evidencia.dto';
import { CrearIncidenciaDto } from './dto/crear-incidencia.dto';
import { ActualizarEstadoDto } from './dto/actualizar-estado.dto';
import { ListarIncidenciasQueryDto } from './dto/listar-incidencias-query.dto';
import { PrioridadDinamicaQueryDto } from './dto/prioridad-dinamica-query.dto';
import { IncidenciasService } from './incidencias.service';

@Controller('incidencias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IncidenciasController {
  constructor(private readonly incidenciasService: IncidenciasService) { }

  @Get()
  listar(@Query() query: ListarIncidenciasQueryDto) {
    return this.incidenciasService.listar(query);
  }

  @Get('prioridades-dinamicas')
  obtenerReportePrioridades(@Query() query: PrioridadDinamicaQueryDto) {
    return this.incidenciasService.obtenerReportePrioridades(query);
  }

  @Post()
  crear(
    @Body() body: CrearIncidenciaDto,
    @CurrentUser() usuario: JwtUser,
  ) {
    const idUsuario = usuario.sub || usuario.userId;
    if (!idUsuario) throw new UnauthorizedException('Usuario autenticado inválido');
    return this.incidenciasService.crear(body, idUsuario, usuario.email);
  }

  @Get(':id_incidencia/prioridad-dinamica')
  obtenerPrioridadDinamica(
    @Param('id_incidencia', ParseUUIDPipe) id: string,
    @Query() query: PrioridadDinamicaQueryDto,
  ) {
    return this.incidenciasService.obtenerPrioridadDinamica(id, query);
  }

  @Get(':id_incidencia')
  obtener(@Param('id_incidencia', ParseUUIDPipe) id: string) {
    return this.incidenciasService.obtener(id);
  }

  @Patch(':id_incidencia/estado')
  @Roles('SUPERVISOR', 'TECNICO', 'TÉCNICO', 'REPORTANTE', 'ADMINISTRADOR')
  async actualizarEstado(
    @Param('id_incidencia', ParseUUIDPipe) incidenciaId: string,
    @Body() body: ActualizarEstadoDto,
    @CurrentUser() usuario: JwtUser,
  ) {
    const idUsuario = usuario.sub || usuario.userId;
    const rolUsuario = usuario.rol || usuario.role;
    if (!idUsuario || !rolUsuario) {
      throw new UnauthorizedException('Usuario autenticado inválido');
    }

    return this.incidenciasService.actualizarEstado(
      incidenciaId,
      body.id_estado,
      idUsuario,
      rolUsuario,
      usuario.email,
    );
  }

  @Patch(':id_incidencia/resolver')
  @Roles('TECNICO', 'TÉCNICO')
  async resolverIncidencia(
    @Param('id_incidencia', ParseUUIDPipe) idIncidencia: string,
    @CurrentUser() usuario: JwtUser,
  ) {
    const idUsuario = usuario.sub || usuario.userId;
    const rolUsuario = usuario.rol || usuario.role;
    if (!idUsuario || !rolUsuario) {
      throw new UnauthorizedException('Usuario autenticado inválido');
    }

    return this.incidenciasService.resolverIncidencia(
      idIncidencia,
      idUsuario,
      rolUsuario,
      usuario.email,
    );
  }

  @Get(':id_incidencia/historial')
  listarHistorial(@Param('id_incidencia', ParseUUIDPipe) id: string) {
    return this.incidenciasService.listarHistorial(id);
  }

  @Get(':id_incidencia/evidencias')
  listarEvidencias(@Param('id_incidencia', ParseUUIDPipe) id: string) {
    return this.incidenciasService.listarEvidencias(id);
  }

  @Post(':id_incidencia/evidencias')
  crearEvidencia(
    @Param('id_incidencia', ParseUUIDPipe) id: string,
    @Body() body: CrearEvidenciaDto,
  ) {
    return this.incidenciasService.crearEvidencia(id, body);
  }

  @Post(':id_incidencia/evidencias/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEvidencia(
    @Param('id_incidencia', ParseUUIDPipe) id: string,
    @Body('id_tipo_evidencia') id_tipo_evidencia: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png)$/,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: any,
  ) {
    return this.incidenciasService.procesarYGuardarEvidencia(id, Number(id_tipo_evidencia), file);
  }
}