import type { StatusNotificacao } from '../../../commons/database/db.types';

export class NotificacaoResponse {
  idNotificacao: number;
  idUsuario: number | null;
  emailDestinatario: string;
  tipoEvento: string;
  status: StatusNotificacao;
  tentativas: number;
  criadoEm: Date;
  enviadoEm: Date | null;
  proximaTentativaEm: Date;
  ultimoErro: string | null;
  assunto: string | null;
  provedor: string | null;
  idMensagemProvedor: string | null;
  // Os dados do texto, sem o link com token.
  dados: Record<string, unknown>;
}

export class NotificacaoResponseSummary {
  pendentes: number;
  falhas: number;
  enviadosUltimos7Dias: number;
  cancelados: number;
}
