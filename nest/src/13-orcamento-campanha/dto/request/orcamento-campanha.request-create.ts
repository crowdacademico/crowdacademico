import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

// fn_congela_orcamento_campanha (05) bloqueia INSERT/UPDATE/DELETE depois
// que a campanha sai de 'aguardando_aprovacao'/'rejeitado' - não checado
// aqui de propósito, mesmo raciocínio de link-academico.service.create.ts.
// fn_valida_limite_max_orcamento_campanha (05) barra passar de
// configuracoes.orcamento_max_itens.
export class OrcamentoCampanhaRequestCreate {
  @IsInt()
  idCampanha: number;

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
