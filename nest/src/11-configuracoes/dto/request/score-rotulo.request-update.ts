import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScoreFaixaRequest {
  @IsInt()
  idRotulo: number;

  @IsString({ message: 'Dê um nome à faixa.' })
  @Matches(/\S/, { message: 'Dê um nome à faixa.' })
  @MaxLength(50, {
    message: 'O nome da faixa pode ter no máximo 50 caracteres.',
  })
  rotulo: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'A descrição pode ter no máximo 255 caracteres.' })
  descricao?: string | null;

  @IsInt({ message: 'O início da faixa é um número inteiro.' })
  @Min(0)
  @Max(100)
  scoreMinimo: number;

  @IsInt({ message: 'O fim da faixa é um número inteiro.' })
  @Min(0)
  @Max(100)
  scoreMaximo: number;
}

// Todas as faixas numa requisição só: cobrir de 0 a 100 sem buraco nem sobreposição é conferido no fim.
export class ScoreRotuloRequestUpdate {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScoreFaixaRequest)
  faixas: ScoreFaixaRequest[];
}
