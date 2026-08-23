import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CampanhaRequestRejeitar {
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  justificativa?: string;
}
