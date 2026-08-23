import { IsInt } from 'class-validator';

export class SeguirCampanhaRequestCreate {
  @IsInt()
  idCampanha: number;
}
