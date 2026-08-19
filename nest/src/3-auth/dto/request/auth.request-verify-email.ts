import { IsString, MinLength } from 'class-validator';

export class VerificarEmailRequestDto {
  @IsString()
  @MinLength(1, { message: 'Token é obrigatório.' })
  token: string;
}
