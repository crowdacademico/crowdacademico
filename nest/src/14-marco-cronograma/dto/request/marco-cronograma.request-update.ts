import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class MarcoCronogramaRequestUpdate {
  @IsString()
  @MaxLength(150)
  titulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  descricao?: string;

  @IsDateString()
  dataPrevista: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;
}
