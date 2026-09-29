import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  TermoUsoRequestUpdate,
  TermoUsoRequestCreate,
  TermoUsoResponse,
  TermoUsoResponseActive,
  TipoTermo,
} from '../type/termo-uso.type';

// Objeto (mesma convenção de todo o resto dos api.ts do projeto), não função solta.
export const termoUsoApi = {
  // GET /termos-uso/ativo é público (sem guard no Nest, ver nest/src/5-termo-uso): usa fetch puro, não
  // authFetch, pelo mesmo motivo de auth.api.ts: quem chama isso (tela de Cadastro) ainda não tem sessão
  // nenhuma. `tipo` obrigatório: há 1 versão ativa por termo, então "o termo ativo" sem dizer qual é
  // ambíguo.
  buscarAtivo: (tipo: TipoTermo): Promise<TermoUsoResponseActive> =>
    fetch(`${API_BASE_URL}/termos-uso/ativo?tipo=${tipo}`).then(tratarResposta<TermoUsoResponseActive>),
  // GET /termos-uso (sem "/ativo") - listagem completa (histórico incluso),
  // exige sessão - só a tela de administração usa.
  listar: (authFetch: AuthFetch): Promise<TermoUsoResponse[]> =>
    authFetch('/termos-uso').then(tratarResposta<TermoUsoResponse[]>),
  criar: (authFetch: AuthFetch, dados: TermoUsoRequestCreate): Promise<TermoUsoResponse> =>
    authFetch('/termos-uso', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta<TermoUsoResponse>),
  // GET /termos-uso/:id - carrega uma versão específica (tela de Alterar
  // precisa dos dados atuais antes de editar).
  buscar: (authFetch: AuthFetch, id: number): Promise<TermoUsoResponse> =>
    authFetch(`/termos-uso/${id}`).then(tratarResposta<TermoUsoResponse>),
  // PATCH /termos-uso/:id - só funciona enquanto ninguém aceitou a versão
  // ainda (ver TermoUsoServiceUpdate no Nest); o backend responde 409 caso
  // contrário.
  atualizar: (
    authFetch: AuthFetch,
    id: number,
    dados: TermoUsoRequestUpdate,
  ): Promise<TermoUsoResponse> =>
    authFetch(`/termos-uso/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta<TermoUsoResponse>),
  // PATCH /termos-uso/:id/ativar: torna esta versão a vigente do seu tipo (ação separada de criar/atualizar:
  // Criar não ativa sozinho, ver TermoUsoServiceCreate no Nest).
  ativar: (authFetch: AuthFetch, id: number): Promise<TermoUsoResponse> =>
    authFetch(`/termos-uso/${id}/ativar`, { method: 'PATCH' }).then(
      tratarResposta<TermoUsoResponse>,
    ),
  // DELETE /termos-uso/:id: nunca permitido na versão vigente nem numa versão já aceita por alguém (RF-091: o
  // aceite é a prova; o banco recusa com 409). Só a versão nunca aceita pode ser excluída.
  excluir: (authFetch: AuthFetch, id: number): Promise<void> =>
    authFetch(`/termos-uso/${id}`, { method: 'DELETE' }).then(tratarResposta<void>),
  // POST /termos-uso/:id/aceitar: RF-015, a própria conta aceita a versão vigente que estava pendente. Depois disso a
  // sessão precisa ser renovada para sair da tela de aceite (o crachá novo não tem mais a marca de pendência).
  aceitar: (authFetch: AuthFetch, id: number): Promise<void> =>
    authFetch(`/termos-uso/${id}/aceitar`, { method: 'POST' }).then(tratarResposta<void>),
};
