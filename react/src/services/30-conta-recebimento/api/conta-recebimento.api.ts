import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { TipoChavePix } from '../../constant/type/enums-do-banco.gerado';
import type { ContaRecebimentoResponse, RepasseResponse } from '../type/conta-recebimento.type';

// Espelha nest/src/30-conta-recebimento: a chave Pix onde o próprio pesquisador recebe o repasse, e os repasses das
// campanhas dele. Sempre a conta logada (o backend pega o id do token).
const BASE = '/conta-recebimento';

export const contaRecebimentoApi = {
  // null = ainda sem chave.
  buscar: (authFetch: AuthFetch): Promise<ContaRecebimentoResponse | null> => authFetch(BASE).then(tratarResposta<ContaRecebimentoResponse | null>),
  cadastrar: (authFetch: AuthFetch, tipoChave: TipoChavePix, chave: string): Promise<ContaRecebimentoResponse | null> =>
    authFetch(BASE, { method: 'POST', body: JSON.stringify({ tipoChave, chave }) }).then(tratarResposta<ContaRecebimentoResponse | null>),
  remover: (authFetch: AuthFetch): Promise<void> => authFetch(BASE, { method: 'DELETE' }).then(tratarResposta<void>),
  listarRepasses: (authFetch: AuthFetch): Promise<RepasseResponse[]> => authFetch(`${BASE}/repasses`).then(tratarResposta<RepasseResponse[]>),
};
