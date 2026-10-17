import { ResultadoConsultaChavePix } from '../dto/resultado-chave-pix.dto';
import { ResultadoRepasse } from '../dto/resultado-repasse.dto';

export const REPASSE_GATEWAY = 'REPASSE_GATEWAY';

export type TipoChavePix = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

export interface TransferirParams {
  // Mesma chave => mesma transferência, sem duplicar (repasse.chave_idempotencia, PR-09).
  chaveIdempotencia: string;
  valor: number;
  destino: { tipoChave: TipoChavePix; chave: string };
  descricao?: string;
}

// Contrato de transferência (repasse ao pesquisador). Em lote por campanha, nunca por contribuição (custo de
// tarifa): quem decide o agrupamento é o worker, esta porta só executa UMA transferência.
export interface RepasseGatewayPort {
  readonly provedor: string;
  transferir(params: TransferirParams): Promise<ResultadoRepasse>;
  consultarTransferencia(idTransferencia: string): Promise<ResultadoRepasse>;
  // Consulta de titularidade de chave Pix (DICT): usada ao CADASTRAR a conta de recebimento, antes de gravar
  // titularidade_verificada_em (PR-12). Não move dinheiro.
  consultarChavePix(
    destino: TransferirParams['destino'],
  ): Promise<ResultadoConsultaChavePix>;
}
