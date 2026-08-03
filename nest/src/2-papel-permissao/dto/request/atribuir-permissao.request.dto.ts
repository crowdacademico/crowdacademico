import { IsInt } from 'class-validator';

export class AtribuirPermissaoRequestDto {
  @IsInt()
  idPapel: number;

  @IsInt()
  idPermissao: number;
}
