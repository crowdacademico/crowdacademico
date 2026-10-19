import type { StatusNotificacao } from '../../constant/type/enums-do-banco.gerado';

// Espelha nest/src/27-notificacao/dto/response/notificacao.response.ts. As datas chegam como texto ISO.
export interface NotificacaoResponse {
  idNotificacao: number;
  idUsuario: number | null;
  emailDestinatario: string;
  // O tipo do e-mail (verificacao_email, campanha_aprovada...), traduzido em notificacao.constants.ts.
  tipoEvento: string;
  status: StatusNotificacao;
  tentativas: number;
  criadoEm: string;
  enviadoEm: string | null;
  proximaTentativaEm: string;
  ultimoErro: string | null;
  // Preenchido quando o e-mail é montado (enviado ou falhou); antes disso, vazio.
  assunto: string | null;
  provedor: string | null;
  idMensagemProvedor: string | null;
  // O que o texto do e-mail usa (nome, título da campanha...). O link com token nunca vem.
  dados: Record<string, unknown>;
}

export interface NotificacaoResumo {
  pendentes: number;
  falhas: number;
  enviadosUltimos7Dias: number;
  cancelados: number;
}

