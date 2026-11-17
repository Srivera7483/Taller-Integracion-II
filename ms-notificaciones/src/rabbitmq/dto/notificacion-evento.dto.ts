import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoNotificacion {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBHOOK = 'WEBHOOK',
}

export enum PrioridadNotificacion {
  BAJA = 'BAJA',
  MEDIA = 'MEDIA',
  ALTA = 'ALTA',
  CRITICA = 'CRITICA',
}

class DestinatarioDto {
  @IsString()
  @IsNotEmpty()
  usuarioId!: string;

  @IsString()
  @IsNotEmpty()
  canal!: string;

  @IsOptional()
  @IsString()
  direccion?: string;
}

export class NotificacionEventoDto {
  @IsEnum(TipoNotificacion)
  tipo!: TipoNotificacion;

  @IsEnum(PrioridadNotificacion)
  prioridad!: PrioridadNotificacion;

  @IsString()
  @IsNotEmpty()
  asunto!: string;

  @IsString()
  @IsNotEmpty()
  cuerpo!: string;

  @ValidateNested()
  @Type(() => DestinatarioDto)
  @IsObject()
  destinatario!: DestinatarioDto;

  @IsOptional()
  @IsString()
  idCorrelacion?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
