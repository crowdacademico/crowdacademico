import { tratarResposta } from '../../constant/api/http.util';
import type { AuthFetch } from '../../3-auth/type/auth.type';
import type { ResultadoPaginado } from '../../constant/type/paginacao.type';
import type { LogAuditoriaResponse } from '../type/log-auditoria.type';

// `tabela` é o nome físico da tabela no Postgres (ex.: 'usuario'), o mesmo valor que fn_log_auditoria() grava
// via TG_TABLE_NAME. Devolve o objeto paginado inteiro ({ dados, total, pagina, tamanho }), sem desembrulhar
// `.dados` aqui (diferente de usuarioApi.listar/configuracaoApi.listar): quem usa isso
// (log-auditoria-painel.tsx) quer saber o total também.
export const logAuditoriaApi = {
  // `pagina`: o backend (log-auditoria.service.findall.ts) já pagina de verdade (LIMIT/OFFSET, 20 por página),
  // diferente de usuario/configuracao (que buscam tudo e paginam no navegador); o front só precisa pedir a
  // página certa.
  listarPorTabela: (
    authFetch: AuthFetch,
    tabela: string,
    pagina = 1,
  ): Promise<ResultadoPaginado<LogAuditoriaResponse>> =>
    authFetch(
      `/log-auditoria?tabela=${encodeURIComponent(tabela)}&pagina=${pagina}`,
    ).then(tratarResposta<ResultadoPaginado<LogAuditoriaResponse>>),
  // Últimas ações do PRÓPRIO usuário logado, de qualquer tabela: usado pelo sino "Atividade recente" do
  // cabeçalho. Já vem como array pronto (sem paginação: o sino só mostra as últimas N).
  minhaAtividade: (authFetch: AuthFetch): Promise<LogAuditoriaResponse[]> =>
    authFetch('/log-auditoria/minha-atividade').then(tratarResposta<LogAuditoriaResponse[]>),
};
