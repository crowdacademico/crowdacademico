import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

// fn_congela_marco_cronograma (05) bloqueia INSERT/UPDATE/DELETE depois
// que a campanha efetivamente começa (data_inicio <= NOW()) - não checado
// aqui, mesmo raciocínio de orcamento-campanha.service.create.ts.
// fn_valida_data_marco_cronograma (05) exige dataPrevista >=
// campanha.data_inicio; fn_valida_limite_max_marco_cronograma barra
// passar de configuracoes.cronograma_max_marcos.
export class MarcoCronogramaRequestCreate {
  @IsInt()
  idCampanha: number;

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
