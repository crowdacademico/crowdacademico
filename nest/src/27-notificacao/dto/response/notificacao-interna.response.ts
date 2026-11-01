// Um aviso do sino, com o texto já montado do modelo.
export class NotificacaoInternaResponse {
  idNotificacao: number;
  tipoEvento: string;
  titulo: string;
  mensagem: string;
  criadoEm: Date;
  lidaEm: Date | null;
}

export class NotificacaoInternaResumo {
  naoLidas: number;
}
