import type { StatusNotificacao } from '../../constant/type/enums-do-banco.gerado';
import type { CanalNotificacao } from './modelo-mensagem.type';

// Espelha nest/src/27-notificacao/dto/response/notificacao.response.ts. As datas chegam como texto ISO.
export interface NotificacaoResponse {
  idNotificacao: number;
  idUsuario: number | null;
  // Null quando a conta foi removida (o aviso fica no histórico).
  nomeUsuario: string | null;
  canal: CanalNotificacao;
  // Null no sino, que não tem e-mail de destino.
  emailDestinatario: string | null;
  // O tipo do e-mail (verificacao_email, campanha_aprovada...), traduzido em notificacao.constants.ts.
  tipoEvento: string;
  status: StatusNotificacao;
  tentativas: number;
  criadoEm: string;
  enviadoEm: string | null;
  // Só o sino: quando a pessoa leu.
  lidaEm: string | null;
  proximaTentativaEm: string;
  ultimoErro: string | null;
  // Preenchido quando o e-mail é montado (enviado ou falhou); antes disso, vazio. No sino, o título do aviso.
  assunto: string | null;
  // O texto do aviso montado com o modelo de hoje (tela Mensagens); no e-mail, sem o botão. null = tipo sem modelo.
  conteudo: string | null;
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

