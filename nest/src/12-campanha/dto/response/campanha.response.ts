import type {
  ModeloCampanha,
  StatusCampanha,
} from '../../../commons/database/db.types';

export class CampanhaResponse {
  idCampanha: number;
  idUsuario: number;
  idAdmin: number | null;
  idAreaConhecimento: number;
  titulo: string;
  modelo: ModeloCampanha;
  metaFinanceira: number;
  valorBrutoArrecadado: number;
  taxaPlataforma: number | null;
  descricao: string | null;
  dataInicio: Date | null;
  dataFim: Date | null;
  status: StatusCampanha;
  aprovadoEm: Date | null;
  encerradoEm: Date | null;
  videoApresentacaoUrl: string | null;
  criadoEm: Date;
  // Só preenchidos por GET /campanha/:id, e só para campanha 'rejeitado'
  // (ciclo de rejeição e reenvio, ver REQUISITOS_V7). A tela e o e-mail de
  // rejeição precisam desses números, e calculá-los no cliente duplicaria a
  // regra. Nas demais respostas ficam null/false.
  reenviosRestantes: number | null;
  prazoReenvioAte: Date | null;
  somenteLeitura: boolean;
}
