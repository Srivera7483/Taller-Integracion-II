import { IsEnum, IsNotEmpty } from 'class-validator';

export enum RoleEnum {
  ADMINISTRADOR = 'ADMINISTRADOR',
  SUPERVISOR = 'SUPERVISOR',
  TECNICO = 'TECNICO',
  REPORTANTE = 'REPORTANTE',
}

export class UpdateRoleDto {
  @IsNotEmpty({ message: 'El campo rol es obligatorio' })
  @IsEnum(RoleEnum, { message: 'El rol especificado no es válido' })
  rol!: RoleEnum;
}