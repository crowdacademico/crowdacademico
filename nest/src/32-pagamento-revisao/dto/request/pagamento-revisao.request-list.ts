import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const SITUACOES_REVISAO = [
  'em_revisao_manual',
  'vale_tentar_de_novo',
] as const;
export type SituacaoRevisao = (typeof SITUACOES_REVISAO)[number];

// Limite das listagens do painel: a quem opera cabe uma tela, não o banco inteiro.
export class PagamentoRevisaoRequestLimite {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limite?: number;
}

export class PagamentoRevisaoRequestList extends PagamentoRevisaoRequestLimite {
  // em_revisao_manual: o sistema NÃO aplicou de propósito e alguém precisa decidir.
  // vale_tentar_de_novo: falhou por motivo transitório. Sem o filtro: as duas.
  @IsOptional()
  @IsIn(SITUACOES_REVISAO)
  situacao?: SituacaoRevisao;
}
