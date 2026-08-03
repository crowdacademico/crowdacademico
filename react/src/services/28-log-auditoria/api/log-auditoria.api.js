import { tratarResposta } from '../../constant/api/http.util';

// `tabela` é o nome físico da tabela no Postgres (ex.: 'usuario') — o mesmo
// valor que fn_log_auditoria() grava via TG_TABLE_NAME. Devolve o objeto
// paginado inteiro ({ dados, total, pagina, tamanho }), sem desembrulhar
// `.dados` aqui (diferente de usuarioApi.listar/configuracaoApi.listar) —
// quem usa isso (log-auditoria-painel.jsx) quer saber o total também.
export const logAuditoriaApi = {
  listarPorTabela: (authFetch, tabela) =>
    authFetch(`/log-auditoria?tabela=${encodeURIComponent(tabela)}`).then(tratarResposta),
};
