export const PG_POOL = 'PG_POOL';

// Chave usada pelo GlobalDbInterceptor (commons/database/global-db.interceptor.ts)
// pra guardar a instância do Kysely já vinculada ao client/transação da
// requisição atual no contexto do nestjs-cls (AsyncLocalStorage). Services
// nunca leem isso direto — sempre via DatabaseService.getDb().
export const CLS_KEY_KYSELY_DB = 'kyselyDb';

// Variável de sessão do Postgres que carrega o id do usuário autenticado
// (lida por public.id_usuario_atual(), 03_funcoes_seguranca.sql). Setada pelo
// GlobalDbInterceptor via `SELECT set_config(...)`, nunca por SQL interpolado.
export const PG_SESSION_VAR_ID_USUARIO_ATUAL = 'app.id_usuario_atual';
