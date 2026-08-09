import { IsDateString } from 'class-validator';

export class SuspenderPapelUsuarioRequestDto {
  @IsDateString()
  ate: string;
}
