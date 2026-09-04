import { tratarResposta } from '../../constant/api/http.util';

// `tabela` é o nome físico da tabela no Postgres (ex.: 'usuario') - o mesmo
// valor que fn_log_auditoria() grava via TG_TABLE_NAME. Devolve o objeto
// paginado inteiro ({ dados, total, pagina, tamanho }), sem desembrulhar
// `.dados` aqui (diferente de usuarioApi.listar/configuracaoApi.listar) -
// quem usa isso (log-auditoria-painel.jsx) quer saber o total também.
export const logAuditoriaApi = {
  // `pagina` (11-08-2026, achado da parceira do Lucas: "vai virar aquela
  // listona conforme o sistema cresce") - o backend (log-auditoria.
  // service.findall.ts) já pagina de verdade (LIMIT/OFFSET, 20 por
  // página), diferente de usuario/configuracao (que buscam tudo e
  // paginam no navegador); só faltava o front pedir a página certa.
  listarPorTabela: (authFetch, tabela, pagina = 1) =>
    authFetch(
      `/log-auditoria?tabela=${encodeURIComponent(tabela)}&pagina=${pagina}`,
    ).then(tratarResposta),
  // Últimas ações do PRÓPRIO usuário logado, de qualquer tabela - usado
  // pelo sino "Atividade recente" do cabeçalho (09-08-2026). Já vem como
  // array pronto (sem paginação - o sino só mostra as últimas N).
  minhaAtividade: (authFetch) => authFetch('/log-auditoria/minha-atividade').then(tratarResposta),
};
