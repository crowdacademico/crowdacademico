import { SetMetadata } from '@nestjs/common';

export const CHAVE_SEM_TRANSACAO_GLOBAL = 'semTransacaoGlobal';

// Toda rota HTTP roda dentro da transação por requisição do GlobalDbInterceptor (BEGIN ... COMMIT, com UM client do
// pool preso do começo ao fim). Isso é exatamente o que a RLS precisa (seção 2 de DOCUMENTACAO_BACKEND.md) e é ótimo
// para rota que só fala com o banco.
//
// O problema aparece quando a rota ESPERA ALGUÉM DE FORA no meio do caminho (gateway de pagamento, que pode levar
// segundos): o client fica preso, dentro de uma transação aberta, sem fazer nada. Com o pool limitado, algumas poucas
// chamadas lentas esgotam as conexões e o sistema inteiro para de responder, inclusive rotas que não têm nada a ver.
//
// `@SemTransacaoGlobal()` faz o interceptor NÃO abrir transação e NÃO pegar client do pool: a rota segue direto para o
// handler. Pode ser colocado no método ou na classe inteira.
//
// O QUE MUDA PARA QUEM USA (leia antes de aplicar):
//  - `DatabaseService.getDb()` lança erro nessa rota (não há Kysely no contexto). Use `@Inject(PG_POOL)`.
//  - `app.id_usuario_atual` NÃO é setado. Query direta em tabela com RLS enxerga como anônimo. Quem precisa do
//    usuário abre a PRÓPRIA transação curta (`pool.connect()`, BEGIN, set_config(...), COMMIT, release) ou chama
//    função SECURITY DEFINER (o caso do webhook).
//  - Nada é desfeito sozinho: o que a rota gravar em passos separados já está commitado. O padrão das rotas de
//    pagamento é: (1) transação curta grava `pendente` e comita; (2) chama o gateway FORA de qualquer transação;
//    (3) segunda transação curta registra o resultado via atualizar_status_contribuicao().
export const SemTransacaoGlobal = () =>
  SetMetadata(CHAVE_SEM_TRANSACAO_GLOBAL, true);
