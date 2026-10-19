import type {
  MeioPagamento,
  StatusContribuicao,
} from '../../../commons/database/db.types';

export class ContribuicaoResponseMine {
  idContribuicao: number;
  idCampanha: number;
  tituloCampanha: string | null;
  valor: number;
  // A tarifa do meio de pagamento, paga por cima do valor (o total cobrado é valor + taxaPagamento).
  taxaPagamento: number;
  idRepasse: number | null;
  meioPagamento: MeioPagamento;
  status: StatusContribuicao;
  anonima: boolean;
  criadoEm: Date;
  tituloRecompensa: string | null;
}
