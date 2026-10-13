import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

// Sem status/aprovado_em/id_admin/taxa_plataforma aqui de propósito - quem
// muda status são os endpoints de ação (aprovar/rejeitar), nunca este PATCH
// genérico. trg_campanha_valida_transicao (05) já bloquearia uma tentativa
// de mudar status por aqui mesmo que o DTO permitisse, mas nem chega a
// tentar. Sem modelo também, por enquanto: a regra decidida é que o modelo
// pode mudar até a aprovação (o banco congela depois), mas só o
// all-or-nothing é aceito até o módulo de pagamento existir.
export class CampanhaRequestUpdate {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titulo?: string;

  @IsOptional()
  @IsInt()
  idAreaConhecimento?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  metaFinanceira?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  descricao?: string;

  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @IsOptional()
  @IsUrl({}, { message: 'URL inválida.' })
  @MaxLength(500)
  videoApresentacaoUrl?: string;
}
