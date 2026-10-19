import { tratarResposta } from '../../constant/api/http.util';
import { paraQueryString } from '../../constant/api/query-string.util';
import { TAMANHO_PAGINA_MAXIMO_API, desembrulharPaginado, type ResultadoPaginado } from '../../constant/type/paginacao.type';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { NotificacaoResponse, NotificacaoResumo } from '../type/notificacao.type';

// Espelha nest/src/27-notificacao (rotas /notificacao). Tudo exige `notificacao_processar` (sem ela, 403). Quem ENVIA é
// o worker do Nest (4-mail), a cada minuto: aqui só se vê a fila e se trata o que falhou (RF-121).
export const notificacaoApi = {
  // Os e-mails do sistema, do mais novo para o mais antigo. A tela pede o máximo e pagina no navegador, como o resto do
  // painel (desembrulharPaginado avisa no console se vier cortado).
  listar: (authFetch: AuthFetch): Promise<NotificacaoResponse[]> =>
    authFetch(`/notificacao${paraQueryString({ tamanho: TAMANHO_PAGINA_MAXIMO_API })}`)
      .then(tratarResposta<ResultadoPaginado<NotificacaoResponse>>)
      .then(desembrulharPaginado('e-mails')),
  resumo: (authFetch: AuthFetch): Promise<NotificacaoResumo> =>
    authFetch('/notificacao/resumo').then(tratarResposta<NotificacaoResumo>),
  // Só um e-mail que falhou volta para a fila (409 nos outros casos).
  reenviar: (authFetch: AuthFetch, idNotificacao: number): Promise<void> =>
    authFetch(`/notificacao/${idNotificacao}/reenviar`, { method: 'POST' }).then(tratarResposta<void>),
  // Na fila ou que falhou; enviado não se cancela (409).
  cancelar: (authFetch: AuthFetch, idNotificacao: number): Promise<void> =>
    authFetch(`/notificacao/${idNotificacao}/cancelar`, { method: 'POST' }).then(tratarResposta<void>),
};
