import type {
  MeioPagamento,
  StatusContribuicao,
} from '../../../commons/database/db.types';

export class ContribuicaoResponseReceived {
  idContribuicao: number;
  idCampanha: number;
  tituloCampanha: string;
  apoiador: string;
  valor: number;
  meioPagamento: MeioPagamento;
  status: StatusContribuicao;
  criadoEm: Date;
  // Se quem apoiou está no Mural dos apoiadores (RF-105).
  noMural: boolean;
}
