import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  ModeloMensagemRequestUpdate,
  ModeloMensagemResponse,
  NotificacaoInternaResponse,
} from '../type/modelo-mensagem.type';

// Espelha nest/src/27-notificacao: o texto de cada aviso (exige configuracao_gerenciar) e o sino da própria conta.
export const modeloMensagemApi = {
  listar: (authFetch: AuthFetch): Promise<ModeloMensagemResponse[]> =>
    authFetch('/modelo-mensagem').then(tratarResposta<ModeloMensagemResponse[]>),
  atualizar: (authFetch: AuthFetch, id: number, dados: ModeloMensagemRequestUpdate): Promise<ModeloMensagemResponse> =>
    authFetch(`/modelo-mensagem/${id}`, { method: 'PATCH', body: JSON.stringify(dados) }).then(
      tratarResposta<ModeloMensagemResponse>,
    ),
};

export const notificacaoInternaApi = {
  listar: (authFetch: AuthFetch): Promise<NotificacaoInternaResponse[]> =>
    authFetch('/notificacao-interna').then(tratarResposta<NotificacaoInternaResponse[]>),
  naoLidas: (authFetch: AuthFetch): Promise<number> =>
    authFetch('/notificacao-interna/nao-lidas')
      .then(tratarResposta<{ naoLidas: number }>)
      .then((r) => r.naoLidas),
  marcarLida: (authFetch: AuthFetch, idNotificacao: number): Promise<void> =>
    authFetch(`/notificacao-interna/${idNotificacao}/lida`, { method: 'PATCH' }).then(tratarResposta<void>),
  marcarTodas: (authFetch: AuthFetch): Promise<void> =>
    authFetch('/notificacao-interna/lidas', { method: 'PATCH' }).then(tratarResposta<void>),
};
