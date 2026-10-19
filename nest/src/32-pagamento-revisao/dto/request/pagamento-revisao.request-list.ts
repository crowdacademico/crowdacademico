import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const SITUACOES_REVISAO = [
  'processado',
  'vale_tentar_de_novo',
  'em_revisao_manual',
  'revisao_resolvida',
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
  // processado: o sistema aplicou o aviso. vale_tentar_de_novo: falhou por motivo transitório.
  // em_revisao_manual: o sistema NÃO aplicou de propósito e alguém precisa decidir.
  // revisao_resolvida: passou por revisão e uma pessoa já deu baixa. Sem o filtro: todas.
  @IsOptional()
  @IsIn(SITUACOES_REVISAO)
  situacao?: SituacaoRevisao;
}
