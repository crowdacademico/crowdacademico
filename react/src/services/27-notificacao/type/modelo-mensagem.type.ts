// Espelha nest/src/27-notificacao/dto (modelo-mensagem e notificacao-interna). As datas chegam como texto ISO.
export type CanalNotificacao = 'email' | 'interna';

export interface ModeloMensagemResponse {
  idModeloMensagem: number;
  tipoEvento: string;
  canal: CanalNotificacao;
  titulo: string;
  corpo: string;
  ativo: boolean;
  obrigatoria: boolean;
  atualizadoEm: string;
  // Os campos que o texto deste tipo pode usar ({{campo}}).
  campos: string[];
}

export interface ModeloMensagemRequestUpdate {
  titulo?: string;
  corpo?: string;
  ativo?: boolean;
}

// Um aviso do sino, com o texto já montado.
export interface NotificacaoInternaResponse {
  idNotificacao: number;
  tipoEvento: string;
  titulo: string;
  mensagem: string;
  criadoEm: string;
  lidaEm: string | null;
}
