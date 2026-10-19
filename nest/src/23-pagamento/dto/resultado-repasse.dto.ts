// Resultado de domínio de uma transferência (repasse ao pesquisador). Mesma regra de resultado-cobranca.dto.ts:
// o adapter traduz, ninguém fora dele vê o formato do provedor. Valor em reais, `number` com 2 casas.
export type StatusRepasseGateway = 'processando' | 'concluido' | 'erro';

export interface ResultadoRepasse {
  idTransferencia: string;
  status: StatusRepasseGateway;
  valor: number;
  // Só quando status = 'erro'.
  motivoFalha?: string;
}
