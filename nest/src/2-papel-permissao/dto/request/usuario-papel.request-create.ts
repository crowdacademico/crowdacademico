import { IsInt } from 'class-validator';

export class AtribuirPapelRequestDto {
  @IsInt()
  idUsuario: number;

  @IsInt()
  idPapel: number;
}
