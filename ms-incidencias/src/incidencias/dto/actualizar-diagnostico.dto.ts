import { IsNotEmpty, IsString } from 'class-validator';

export class ActualizarDiagnosticoDto {
  @IsString()
  @IsNotEmpty()
  diagnostico_tecnico: string;
}