import { tratarResposta } from '../../constant/api/http.util';

// `tabela` é o nome físico da tabela no Postgres (ex.: 'usuario') — o mesmo
// valor que fn_log_auditoria() grava via TG_TABLE_NAME. Devolve o objeto
// paginado inteiro ({ dados, total, pagina, tamanho }), sem desembrulhar
// `.dados` aqui (diferente de usuarioApi.listar/configuracaoApi.listar) —
// quem usa isso (log-auditoria-painel.jsx) quer saber o total também.
export const logAuditoriaApi = {
  listarPorTabela: (authFetch, tabela) =>
    authFetch(`/log-auditoria?tabela=${encodeURIComponent(tabela)}`).then(tratarResposta),
  // Últimas ações do PRÓPRIO usuário logado, de qualquer tabela — usado
  // pelo sino "Atividade recente" do cabeçalho (09-08-2026). Já vem como
  // array pronto (sem paginação — o sino só mostra as últimas N).
  minhaAtividade: (authFetch) => authFetch('/log-auditoria/minha-atividade').then(tratarResposta),
};
