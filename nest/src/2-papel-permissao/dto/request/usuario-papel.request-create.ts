import { IsInt } from 'class-validator';

export class UsuarioPapelRequestCreate {
  @IsInt()
  idUsuario: number;

  @IsInt()
  idPapel: number;
}
