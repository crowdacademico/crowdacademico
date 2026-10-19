import { IsInt } from 'class-validator';

export class SeguirPesquisadorRequestCreate {
  @IsInt()
  idPesquisador: number;
}
