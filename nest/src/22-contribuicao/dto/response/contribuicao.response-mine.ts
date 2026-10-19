import type {
  MeioPagamento,
  StatusContribuicao,
} from '../../../commons/database/db.types';

export class ContribuicaoResponseMine {
  idContribuicao: number;
  idCampanha: number;
  tituloCampanha: string | null;
  valor: number;
  meioPagamento: MeioPagamento;
  status: StatusContribuicao;
  anonima: boolean;
  criadoEm: Date;
  tituloRecompensa: string | null;
}
