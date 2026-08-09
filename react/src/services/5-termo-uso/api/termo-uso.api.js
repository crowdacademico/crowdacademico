import { API_BASE_URL } from '../../constant/constants/api.constants';
import { tratarResposta } from '../../constant/api/http.util';

// GET /termos-uso/ativo é público (sem guard no Nest, ver
// nest/src/5-termo-uso) — usa fetch puro, não authFetch, pelo mesmo motivo
// de auth.api.js: quem chama isso (tela de Cadastro) ainda não tem sessão
// nenhuma.
export async function buscarAtivo() {
  const resposta = await fetch(`${API_BASE_URL}/termos-uso/ativo`);
  return tratarResposta(resposta);
}
