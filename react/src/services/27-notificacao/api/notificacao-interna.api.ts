import { tratarResposta } from '../../constant/api/http.util';
import { paraQueryString } from '../../constant/api/query-string.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';

export interface NotificacaoInternaResponse {
  id_notificacao_interna: number;
  tipo_evento: string;
  titulo: string;
  mensagem: string;
  dados: Record<string, unknown>;
  url_destino: string | null;
  criado_em: string;
  lida_em: string | null;
}

export interface NotificacaoInternaResumo {
  total_nao_lidas: number;
}

export const notificacaoInternaApi = {
  listar: (
    authFetch: AuthFetch,
    limite = 20,
    somenteNaoLidas = false,
  ): Promise<NotificacaoInternaResponse[]> =>
    authFetch(
      `/notificacoes-internas${paraQueryString({ limite, somenteNaoLidas })}`,
    ).then(tratarResposta<NotificacaoInternaResponse[]>),

  resumo: (authFetch: AuthFetch): Promise<NotificacaoInternaResumo> =>
    authFetch('/notificacoes-internas/resumo').then(
      tratarResposta<NotificacaoInternaResumo>,
    ),

  marcarLida: (
    authFetch: AuthFetch,
    idNotificacao: number,
  ): Promise<{ atualizada: boolean }> =>
    authFetch(`/notificacoes-internas/${idNotificacao}/lida`, {
      method: 'PATCH',
    }).then(tratarResposta<{ atualizada: boolean }>),

  marcarTodasLidas: (
    authFetch: AuthFetch,
  ): Promise<{ quantidade: number }> =>
    authFetch('/notificacoes-internas/ler-todas', { method: 'PATCH' }).then(
      tratarResposta<{ quantidade: number }>,
    ),
};