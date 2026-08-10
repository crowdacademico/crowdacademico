import { tratarResposta } from '../../constant/api/http.util';

// authFetch vem de use-auth.js (services/3-auth/hook) — injetado, não
// importado direto, pra este arquivo não precisar saber nada de token.
export const usuarioApi = {
  // GET /usuario devolve { dados, total, pagina, tamanho } desde 03-08-2026
  // (achado do Claude Web: findall sem limit/offset baixaria a tabela
  // inteira quando ela crescer) — `.dados` desembrulhado aqui, uma vez só,
  // pra GenericTable e todo o resto do app continuar recebendo um array
  // puro, sem precisar saber que pagina/total existem.
  listar: (authFetch) =>
    authFetch('/usuario')
      .then(tratarResposta)
      .then((resposta) => resposta.dados),
  buscar: (authFetch, id) => authFetch(`/usuario/${id}`).then(tratarResposta),
  criar: (authFetch, dados) =>
    authFetch('/usuario', { method: 'POST', body: JSON.stringify(dados) }).then(
      tratarResposta,
    ),
  atualizar: (authFetch, id, dados) =>
    authFetch(`/usuario/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dados),
    }).then(tratarResposta),
  remover: (authFetch, id) =>
    authFetch(`/usuario/${id}`, { method: 'DELETE' }).then(tratarResposta),
  // Zera tentativas de login falhas + bloqueado_ate (liberar_bloqueio_login,
  // 03_funcoes_seguranca.sql [03-O]) — existia no banco desde sempre, mas
  // nenhum endpoint chamava (achado 03-08-2026: conta bloqueada por
  // excesso de tentativas de login não tinha NENHUM jeito de desbloquear
  // pelo painel).
  desbloquear: (authFetch, id) =>
    authFetch(`/usuario/${id}/desbloquear`, { method: 'POST' }).then(tratarResposta),
  // Histórico de login (07-08-2026) — cada linha de `sessao` já É um login,
  // não precisou de tabela nova; mais recente primeiro.
  listarLogins: (authFetch, id) =>
    authFetch(`/usuario/${id}/logins`).then(tratarResposta),
  // Suspensão de MODERAÇÃO (09-08-2026, Bloco G) — diferente de
  // `desbloquear` acima (aquele é bloqueio automático por senha errada).
  // `ate` é ISO string. "Reduzir a pena" é chamar `suspender` de novo com
  // uma data mais próxima, não existe endpoint separado pra isso.
  buscarSuspensao: (authFetch, id) =>
    authFetch(`/usuario/${id}/suspensao`).then(tratarResposta),
  suspender: (authFetch, id, ate, motivo) =>
    authFetch(`/usuario/${id}/suspender`, {
      method: 'POST',
      body: JSON.stringify({ ate, motivo }),
    }).then(tratarResposta),
  revogarSuspensao: (authFetch, id) =>
    authFetch(`/usuario/${id}/revogar-suspensao`, { method: 'POST' }).then(tratarResposta),
};
