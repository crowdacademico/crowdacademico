import { IsDateString } from 'class-validator';

export class UsuarioPapelRequestSuspend {
  @IsDateString()
  ate: string;
}
