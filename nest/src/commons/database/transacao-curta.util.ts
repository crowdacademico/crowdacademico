import { Pool, PoolClient } from 'pg';

// Uma transação CURTA com a sessão do usuário montada, para rota marcada com @SemTransacaoGlobal() (ver
// sem-transacao-global.decorator.ts e DOCUMENTACAO_BACKEND.md §2.2-B). É a sequência que o GlobalDbInterceptor faz
// para rota comum (BEGIN, set_config das variáveis de sessão, COMMIT/ROLLBACK, release), mas só em volta do TRABALHO
// DE BANCO que o chamador passa, e não da rota inteira: o client volta para o pool antes de qualquer espera externa.
//
// Existe para não repetir esta sequência à mão em cada rota. Esquecer o `set_config` não dá erro nenhum: dá RLS
// silenciosamente cega (a rota enxerga como anônima), exatamente o risco descrito em §2.1.
//
// As variáveis são setadas com `is_local = true` (valem só até o fim desta transação, nunca vazam para o próximo
// uso do client no pool) e sempre como PARÂMETRO (nunca interpoladas na string SQL).
//  - app.id_usuario_atual: lida por id_usuario_atual() (03), base da maioria das policies de RLS.
//  - app.token_sessao_atual: lida por pol_contribuicao_anon_select (04), que deixa quem contribuiu SEM conta ler a
//    própria contribuição. Sem ela, `INSERT ... RETURNING` de contribuição anônima falha na RLS.
// Ausente => string vazia (mesmo que o interceptor faz para requisição anônima).
export interface SessaoTransacaoCurta {
  idUsuario?: number | null;
  tokenSessao?: string | null;
}

export async function executarTransacaoCurta<T>(
  pool: Pool,
  sessao: SessaoTransacaoCurta,
  trabalho: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  // Se até o ROLLBACK falhar, a conexão está em estado desconhecido: não devolve ao pool, descarta.
  let descartarConexao = false;
  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT set_config($1, $2, true), set_config($3, $4, true)',
      [
        'app.id_usuario_atual',
        sessao.idUsuario == null ? '' : String(sessao.idUsuario),
        'app.token_sessao_atual',
        sessao.tokenSessao ?? '',
      ],
    );
    const resultado = await trabalho(client);
    await client.query('COMMIT');
    return resultado;
  } catch (erro) {
    try {
      await client.query('ROLLBACK');
    } catch {
      descartarConexao = true;
    }
    // Sempre o erro ORIGINAL (o do trabalho/COMMIT), nunca o do ROLLBACK: é ele que o PostgresExceptionFilter
    // traduz para a resposta HTTP.
    throw erro;
  } finally {
    client.release(descartarConexao);
  }
}
