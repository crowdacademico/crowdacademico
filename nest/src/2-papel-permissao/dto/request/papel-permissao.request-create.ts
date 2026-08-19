import { IsInt } from 'class-validator';

export class PapelPermissaoRequestCreate {
  @IsInt()
  idPapel: number;

  @IsInt()
  idPermissao: number;
}
