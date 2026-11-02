import type {
  CanalNotificacao,
  StatusNotificacao,
} from '../../../commons/database/db.types';

export class NotificacaoResponse {
  idNotificacao: number;
  idUsuario: number | null;
  // Null quando a conta foi removida (o aviso fica no histórico).
  nomeUsuario: string | null;
  canal: CanalNotificacao;
  // Null no sino, que não tem e-mail de destino.
  emailDestinatario: string | null;
  tipoEvento: string;
  status: StatusNotificacao;
  tentativas: number;
  criadoEm: Date;
  enviadoEm: Date | null;
  // Só o sino: quando a pessoa leu.
  lidaEm: Date | null;
  proximaTentativaEm: Date;
  ultimoErro: string | null;
  // No sino, o título montado do modelo.
  assunto: string | null;
  // O texto montado com o modelo de hoje (tela Mensagens); null quando o tipo não tem modelo neste canal.
  conteudo: string | null;
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
