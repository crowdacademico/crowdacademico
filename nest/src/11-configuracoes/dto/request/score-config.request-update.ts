import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ScoreItemPesoRequest {
  @IsInt()
  idScoreConfig: number;

  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'O peso precisa ser um número com até 2 casas decimais.' },
  )
  @Min(0, { message: 'O peso não pode ser negativo.' })
  @Max(100, { message: 'O peso vai até 100.' })
  peso: number;

  @IsBoolean()
  ativo: boolean;
}

// Todos os pesos numa requisição só: a soma 100 e o "pelo menos um subitem ativo" são conferidos no fim.
export class ScoreConfigRequestUpdate {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ScoreItemPesoRequest)
  itens: ScoreItemPesoRequest[];
}
