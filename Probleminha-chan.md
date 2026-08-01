
## Ponto 1 — SET LOCAL + pool

Não usaria provider Scope.REQUEST. Usaria interceptor global + AsyncLocalStorage (via nestjs-cls).

O motivo de descartar Scope.REQUEST: no Nest, marcar um provider como request-scoped propaga escopo pra toda a árvore de injeção que depende dele — todo service, controller ou outro provider que injeta (direta ou indiretamente) esse provider também vira request-scoped, e o Nest reconstrói essa árvore inteira a cada requisição em vez de uma vez só no boot. Pra 27 módulos, isso significa: ou vocês lembram de marcar Scope.REQUEST em cada novo service que toca banco (e um esquecimento silenciosamente volta a usar conexão errada — exatamente o bug que estamos tentando evitar), ou a marcação vaza pra módulos que nem precisavam. AsyncLocalStorage resolve isso sem tocar em escopo de DI nenhum: o contexto viaja "por fora", implicitamente, então nenhum service precisa saber que existe.

Onde isso vive: um interceptor global, não middleware. Middleware roda antes dos guards — o JWT ainda não foi validado, você não tem request.user ainda. Interceptor roda depois dos guards e antes do handler, que é exatamente onde você já tem o usuário resolvido e ainda não rodou nenhuma query.

GlobalDbInterceptor (interceptor):
  intercept(context, next):
    client = await pool.connect()
    await client.query('BEGIN')
    userId = context.switchToHttp().getRequest().user?.id ?? null
    await client.query('SELECT set_config($1, $2, true)',
                        ['app.id_usuario_atual', userId?.toString() ?? ''])
    cls.set('dbClient', client)

    return next.handle().pipe(
      tap(async () => { await client.query('COMMIT'); client.release(); }),
      catchError(async (err) => {
        await client.query('ROLLBACK'); client.release(); throw err;
      })
    )

Três detalhes que custam caro se esquecidos:

set_config($1, $2, true) parametrizado, não SET LOCAL app.x = '${userId}' interpolado. SET não aceita bind parameter direto, mas set_config() é uma função e aceita — evita concatenar string do usuário dentro de SQL.
Rota pública também passa pelo interceptor, com userId = null. Não dá pra restringir isso só às rotas autenticadas — senão o dia que alguém esquecer de aplicar o guard numa rota nova, ela roda sem transação nenhuma gerenciada, fora do padrão único que vocês querem garantir.
client.release() tem que acontecer sempre, nos dois caminhos (sucesso e erro). Um vazamento de client aqui não dá erro na hora — dá erro três semanas depois, quando o pool esgota sob uso real, e nesse ponto é muito mais difícil de debugar.

Depois disso, um DatabaseService comum, singleton normal, expõe algo como getClient() que só lê do CLS — nenhum service futuro precisa saber de AsyncLocalStorage, Scope.REQUEST ou nada disso, só chama this.db.getClient().query(...).

Sobre a pergunta de performance: não é isso que deve decidir. Na escala de um TCC (dezenas de requisições por segundo, não milhares), a diferença entre request-scoped e AsyncLocalStorage é irrelevante em latência. A razão pra escolher AsyncLocalStorage é superfície de erro, não velocidade: com request-scoped, um novo service esquecido de marcar volta silenciosamente a comportamento singleton (RLS furada sem aviso). Com AsyncLocalStorage, não tem como esquecer, porque não tem nada pra marcar — o service nem sabe que o mecanismo existe.

Uma peça que já está resolvida sem vocês perceberem: o cron (encerrar_campanhas_vencidas()) não precisa passar por nada disso. Ela é SECURITY DEFINER de propósito — já ignora RLS sozinha. O job só precisa de qualquer client do pool pra chamar a função, sem transação especial, sem SET LOCAL. Não construam infraestrutura extra pra isso.

## Ponto 2 — ORM

Kysely, com kysely-codegen gerando os tipos por introspecção do banco real.

O argumento decisivo: kysely-codegen lê o schema que já existe no Postgres — inclusive ENUMs, colunas geradas por trigger, tudo — e gera os tipos TypeScript a partir disso, de novo, cada vez que rodarem. Zero "dono do schema": o dono continua sendo os 8 arquivos .sql, escritos e testados à mão do jeito que já funciona. Kysely em si não tem motor de migração nenhum pra brigar com trigger/RLS/SECURITY DEFINER — ele só monta SQL parametrizado, tipado. Isso combina exatamente com o estilo de vocês, que já confere PK/FK/policy por consulta direta ao catálogo em vez de confiar em abstração.

Kysely também se encaixa limpo no padrão do Ponto 1: dá pra instanciar um Kysely vinculado a um PoolClient específico (não ao Pool inteiro) — então o mesmo client que o interceptor abriu, com a transação e o SET LOCAL já aplicados, é o que o Kysely usa por baixo. É um adaptador pequeno (uma classe implementando a interface de driver do Kysely em cima do client do CLS), não uma reescrita.

Prisma eu descartaria, não só pelo motor de migração: o Prisma roda sua própria engine de conexão (processo Rust por baixo), e fazer ele rodar tudo dentro de uma transação com SET LOCAL no início exige usar as "interactive transactions" dele ($transaction(async (tx) => {...})), o que funciona mas empurra contra o grão da ferramenta. Fora isso, introspecção de ENUM customizado, coluna gerada e função SECURITY DEFINER historicamente tem atrito no Prisma — não é regra dura, mas é fricção que vocês não precisam comprar.

Se preferirem zero dependência nova: pg cru com interface TypeScript escrita à mão por tabela também é escolha legítima, não é "provisório até crescer". Vocês perdem autocomplete de coluna e detecção de typo em tempo de compilação, ganham zero mágica. Pra dupla de TCC com prazo, essa troca é defensável — só recomendo Kysely por cima porque o ganho de segurança (erro de nome de coluna vira erro de compilação, não erro em produção) custa pouco pra instalar e mantém exatamente a mesma filosofia de "banco manda, ferramenta obedece".