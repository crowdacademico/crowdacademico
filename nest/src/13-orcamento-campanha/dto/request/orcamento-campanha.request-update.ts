import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

// Sem idCampanha — mover um item de orçamento pra outra campanha não faz
// sentido de produto (mesmo raciocínio de LinkAcademicoRequestUpdate sem
// idTipoLink).
export class OrcamentoCampanhaRequestUpdate {
  @IsString()
  @MaxLength(150)
  categoria: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  descricao?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  valor: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  ordem?: number;
}
