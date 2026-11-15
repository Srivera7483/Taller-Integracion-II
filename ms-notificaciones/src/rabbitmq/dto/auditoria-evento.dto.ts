import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export enum TipoAccionAuditoria {
  CREACION = 'CREACION',
  ACTUALIZACION = 'ACTUALIZACION',
  ELIMINACION = 'ELIMINACION',
  CAMBIO_ESTADO = 'CAMBIO_ESTADO',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EVENTO_SISTEMA = 'EVENTO_SISTEMA',
}

export class AuditoriaEventoDto {
  @IsEnum(TipoAccionAuditoria)
  accion!: TipoAccionAuditoria;

  @IsString()
  @IsNotEmpty()
  entidad!: string;

  @IsString()
  @IsNotEmpty()
  idEntidad!: string;

  @IsString()
  @IsNotEmpty()
  usuarioId!: string;

  @IsOptional()
  @IsString()
  ipOrigen?: string;

  @IsOptional()
  @IsObject()
  detalles?: Record<string, unknown>;
}
