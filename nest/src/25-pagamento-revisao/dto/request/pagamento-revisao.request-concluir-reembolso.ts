import { IsNumber, IsPositive, Max } from 'class-validator';
import { PagamentoRevisaoRequestObservacao } from './pagamento-revisao.request-observacao';

export class PagamentoRevisaoRequestConcluirReembolso extends PagamentoRevisaoRequestObservacao {
  // O que de fato foi devolvido (em reais). Não pode passar do valor da contribuição: o banco confere (90035).
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'valor deve ter no máximo 2 casas decimais.' },
  )
  @IsPositive({ message: 'valor deve ser maior que zero.' })
  @Max(99999999.99)
  valor: number;
}
