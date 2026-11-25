import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type {
  ContribuicaoCriadaPublica,
  ContribuicaoPublicaRequest,
  StatusContribuicaoPublica,
} from '../type/contribuicao-publica.type';

// Rotas que aceitam visitante: `authFetch` manda o token só quando há sessão. A consulta de status de quem apoiou
// sem conta é liberada pelo X-Token-Sessao devolvido na criação.
export const contribuicaoPublicaApi = {
  criar: (
    authFetch: AuthFetch,
    dados: ContribuicaoPublicaRequest,
  ): Promise<ContribuicaoCriadaPublica> =>
    authFetch('/contribuicao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    }).then(tratarResposta<ContribuicaoCriadaPublica>),

  buscar: (
    authFetch: AuthFetch,
    idContribuicao: number,
    // Quem apoiou sem conta consulta pelo token; com conta, o login basta (sem o token).
    tokenSessao?: string,
  ): Promise<StatusContribuicaoPublica> =>
    authFetch(`/contribuicao/${idContribuicao}`, {
      headers: tokenSessao ? { 'X-Token-Sessao': tokenSessao } : {},
    }).then(tratarResposta<StatusContribuicaoPublica>),

  // SÓ SANDBOX: paga o Pix de mentira (o mesmo que o "Confirmar pagamento" do painel do Asaas). Quem confirma a
  // contribuição continua sendo o webhook; a tela percebe pela consulta de sempre.
  simularPagamento: (
    authFetch: AuthFetch,
    idContribuicao: number,
    tokenSessao?: string,
  ): Promise<void> =>
    authFetch(`/contribuicao/${idContribuicao}/simular-pagamento`, {
      method: 'POST',
      headers: tokenSessao ? { 'X-Token-Sessao': tokenSessao } : {},
    }).then(tratarResposta<void>),
};
