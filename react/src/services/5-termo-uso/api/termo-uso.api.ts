import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  TermoUsoRequestAlterar,
  TermoUsoRequestCriar,
  TermoUsoResponse,
  TermoUsoResponseAtivo,
  TipoTermo,
} from '../type/termo-uso.type';

// Migrado de função solta (`buscarAtivo`) pra objeto (13-09-2026, mesma
// convenção de todo o resto dos api.ts do projeto) ao ganhar `criar`/
// `listar` - só tinha ficado solto porque nasceu com 1 função só.
export const termoUsoApi = {
  // GET /termos-uso/ativo é público (sem guard no Nest, ver
  // nest/src/5-termo-uso) - usa fetch puro, não authFetch, pelo mesmo motivo
  // de auth.api.ts: quem chama isso (tela de Cadastro) ainda não tem sessão
  // nenhuma. `tipo` obrigatório (13-09-2026) - desde a separação em 2 termos
  // ativos simultâneos, "o termo ativo" sem dizer qual trilha virou ambíguo.
  buscarAtivo: (tipo: TipoTermo): Promise<TermoUsoResponseAtivo> =>
    fetch(`${API_BASE_URL}/termos-uso/ativo?tipo=${tipo}`).then(tratarResposta<TermoUsoResponseAtivo>),
  // GET /termos-uso (sem "/ativo") - listagem completa (histórico incluso),
  // exige sessão - só a tela de administração usa.
  listar: (authFetch: AuthFetch): Promise<TermoUsoResponse[]> =>
    authFetch('/termos-uso').then(tratarResposta<TermoUsoResponse[]>),
  criar: (authFetch: AuthFetch, dados: TermoUsoRequestCriar): Promise<TermoUsoResponse> =>
    authFetch('/termos-uso', {
      method: 'POST',
      body: JSON.stringify(dados),
    }).then(tratarResposta<TermoUsoResponse>),
  // GET /termos-uso/:id - carrega uma versão específica (tela de Alterar
  // precisa dos dados atuais antes de editar).
  buscar: (authFetch: AuthFetch, id: number): Promise<TermoUsoResponse> =>
    authFetch(`/termos-uso/${id}`).then(tratarResposta<TermoUsoResponse>),
  // PATCH /termos-uso/:id - só funciona enquanto ninguém aceitou a versão
  // ainda (ver TermoUsoServiceAlterar no Nest); o backend responde 409 caso
  // contrário.
  atualizar: (
    authFetch: AuthFetch,
    id: number,
    dados: TermoUsoRequestAlterar,
  ): Promise<TermoUsoResponse> =>
    authFetch(`/termos-uso/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta<TermoUsoResponse>),
};
