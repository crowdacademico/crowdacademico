# ⚙️ Documentação Técnica do Backend (NestJS) - CrowdAcadêmico

> 📌 **Numeração de RF (29-09-2026):** os requisitos vigentes são o `informacoes/REQUISITOS_V8.md` (122 RFs). Citações de RF por número neste documento foram escritas em datas diferentes e podem estar em qualquer numeração anterior (pré-06-09-2026, V6, V7 ou V8). A `MATRIZ-RASTREABILIDADE-RF.md` já está inteira na numeração do V8 e traz a conversão. Confira pelo texto do requisito antes de confiar no número.

Este documento é o irmão do `DOCUMENTACAO_BD.md`. Ele cobre o backend em NestJS (`nest/`): como a aplicação conversa com o Postgres, como a autenticação funciona, onde mora a autorização, qual é o padrão que todo módulo segue, e como o módulo de upload de arquivo está montado hoje.

> **Leia esta diferença antes de tudo.** `DOCUMENTACAO_BD.md` é um **log histórico narrativo** - ele registra, com data e autoria, cada decisão de modelagem tomada ao longo de semanas de auditoria do banco. **Este documento aqui não é isso.** Ele descreve o **estado atual** do código do backend: o que existe, como funciona e por quê. Datas e atribuições só aparecem quando estão escritas em comentário no próprio código-fonte (o backend é bem comentado, e vários comentários registram "era X, virou Y, motivo Z" - esses estão citados). Onde o código não conta uma história, este documento descreve o comportamento presente e para por aí, em vez de inventar uma cronologia que ninguém pode conferir.
>
> Consequência prática: se você procura "por que o banco é assim", vá no `DOCUMENTACAO_BD.md`. Se você procura "como o Nest usa o banco e o que preciso saber pra escrever o próximo módulo", é aqui.

### Legenda dos símbolos

| Símbolo | Significado |
|---|---|
| 📌 | Nota explicativa - o porquê de uma decisão de arquitetura |
| ⚠️ | Ponto de atenção / débito técnico - funciona, mas vale revisar |
| 🧩 | Armadilha real do código - algo que já quebrou (ou quebraria) se feito do jeito "óbvio" |

---

## 📑 Índice

1. [Visão geral: stack, números e mapa de pastas](#1-visão-geral-stack-números-e-mapa-de-pastas)
2. [O núcleo: uma transação por requisição (`commons/database`)](#2-o-núcleo-uma-transação-por-requisição-commonsdatabase)
3. [Autenticação (`3-auth`)](#3-autenticação-3-auth)
4. [Autorização: a RLS do Postgres é a única fonte de verdade](#4-autorização-a-rls-do-postgres-é-a-única-fonte-de-verdade)
5. [Tratamento de erro: como erro de Postgres vira status HTTP](#5-tratamento-de-erro-como-erro-de-postgres-vira-status-http)
6. [Validação e DTOs (`class-validator` + converters)](#6-validação-e-dtos-class-validator--converters)
7. [O padrão de módulo - anatomia de `1-usuario` e `12-campanha`](#7-o-padrão-de-módulo--anatomia-de-1-usuario-e-12-campanha)
8. [Armazenamento e upload de arquivo (`commons/storage` + `25-arquivo`)](#8-armazenamento-e-upload-de-arquivo-commonsstorage--25-arquivo)
9. [Dado sensível no processo do Nest: CPF (`commons/seguranca`)](#9-dado-sensível-no-processo-do-nest-cpf-commonsseguranca)
10. [Módulos de apoio do painel: `27-log-auditoria`, `28-dashboard`, `5-termo-uso`](#10-módulos-de-apoio-do-painel-27-log-auditoria-28-dashboard-5-termo-uso)
11. [Bootstrap, segurança HTTP e infraestrutura (`main.ts`, `app/`)](#11-bootstrap-segurança-http-e-infraestrutura-maints-app)
12. [Migrations: `aplicar-migrations.script.ts`](#12-migrations-aplicar-migrationsscriptts)
13. [Inventário de rotas HTTP](#13-inventário-de-rotas-http)
14. [O que ainda não existe (pastas vazias)](#14-o-que-ainda-não-existe-pastas-vazias)
15. [Dependências: o que cada uma faz e por que está aqui](#15-dependências-o-que-cada-uma-faz-e-por-que-está-aqui)
16. [Pontos de atenção consolidados](#16-pontos-de-atenção-consolidados)
17. [Como conferir este inventário](#17-como-conferir-este-inventário)
18. [Documentação interativa da API (Swagger/OpenAPI)](#18-documentação-interativa-da-api-swaggeropenapi)

---

## 1. Visão geral: stack, números e mapa de pastas

### 1.1 A stack, e por que cada peça está aí

| Peça | Papel no projeto |
|---|---|
| **NestJS 11** (TypeScript) | Framework HTTP + injeção de dependência. O pipeline dele (guards → interceptors → pipes → handler) é o que torna possível o desenho da seção 2. |
| **Kysely 0.29** | *Query builder* tipado, **não um ORM**. Não há entidades gerenciadas, nem *unit of work*, nem migrations do lado do TypeScript - o schema é escrito à mão em `arquivos_banco_dados/*.sql`, e o Kysely só monta SQL com segurança de tipo em cima dele. |
| **`pg` 8** | Driver Postgres. Usado **diretamente** em três lugares (o `Pool`, o `SET`/`BEGIN`/`COMMIT` do interceptor, e o script de migrations); em todo o resto do app ele fica escondido por baixo do Kysely. |
| **`nestjs-cls`** | `AsyncLocalStorage` embrulhado. Carrega a conexão/transação da requisição atual "por fora", sem nenhum service precisar saber disso. Desde 05-09-2026, também gera o id de requisição usado no log (`RequestLoggerMiddleware`, §2.8). |
| **Supabase** | Só como **host do Postgres** (e, desde então, também do bucket de arquivos - ver seção 8). O Supabase Auth/PostgREST **não** é usado: a autenticação é própria, em `3-auth`. |
| **`@nestjs/jwt` + `bcrypt`** | Access token (JWT) e hash de senha/segredo de refresh token. |
| **`class-validator` / `class-transformer`** | Validação de entrada, via `ValidationPipe` global. |
| **`@nestjs/throttler`** | Rate limit por IP - aplicado em `POST /auth/login` e `POST /auth/cadastro` (ver seção 3). |
| **`helmet`** | Cabeçalhos HTTP de segurança. |
| **`@aws-sdk/client-s3` + `s3-request-presigner`** | Cliente S3 genérico - usado contra o Supabase Storage, não contra a AWS (ver seção 8). |
| **`sharp`** | Processamento de imagem no servidor (redimensiona, converte pra WebP, remove EXIF). |
| **`@nestjs/swagger`** | Documentação interativa da API (`/api`, só fora de produção) - gerada automaticamente a partir dos DTOs já existentes, ver §18. |
| **`@nestjs/schedule`** | Agendamento (`@Cron`) - 6 jobs hoje: encerramento de campanha vencida, fim da suspensão de pesquisador, expiração de rascunho, expiração de campanha rejeitada, retenção do log de auditoria e limpeza de arquivos sem dono, ver §7.4. |

📌 **Por que Kysely e não TypeORM/Prisma, e `class-validator` em vez de Joi.** Embora nos foi ensinado no semestre passado, pelo professor Francisco, do IFSP Birigui, a usar TypeORM + Joi (nos projetos de sala de aula da disciplina de Programação para Web 2), decidimos não utilizar isso aqui devido ao seguinte:

O banco deste projeto não é um detalhe de implementação do backend - ele é onde moram as regras de negócio (dezenas de `RAISE EXCEPTION` com ERRCODE próprio em triggers, mais de 100 policies de RLS, funções `SECURITY DEFINER`, `FORCE ROW LEVEL SECURITY` em todas as 42 tabelas). Um ORM como o TypeORM parte do princípio de que a APLICAÇÃO é dona do schema - ele gera e roda migration sozinho, a partir das entidades TypeScript, e junto disso costuma trazer *lazy loading* de relacionamento e outras conveniências automáticas. Isso é ótimo pra um sistema onde toda a regra mora no código da aplicação (que era o caso dos projetos da disciplina), mas aqui o BANCO é a fonte de verdade de uma parte grande e crítica da lógica (quem pode ver/alterar o quê, transição de status válida, cálculo de score, congelamento de campanha aprovada) - se o ORM tentasse gerenciar esse schema, ele brigaria com a RLS e com as triggers o tempo todo, e um relacionamento carregado sozinho por trás das cenas poderia disparar uma consulta que a RLS bloqueia de um jeito confuso de depurar.

O Kysely resolve o problema real que existe aqui - escrever SQL sem errar nome de coluna, com autocomplete e erro de tipo em tempo de compilação - **sem tentar ser dono do schema**: ele não gera migration, não tem entidade gerenciada, não decide sozinho quando rodar uma consulta. O schema continua sendo só os 8 arquivos `.sql` (`arquivos_banco_dados/`), escritos e revisados à mão, exatamente como o time (eu e a Alexia) já vinha fazendo desde antes do Nest existir no projeto - o Kysely só chegou depois pra tornar mais seguro escrever a consulta em cima desse schema, não pra substituir ele.

Sobre Joi: não é bem que rejeitamos Joi - usamos `class-validator` porque ele já é o padrão mais integrado ao próprio NestJS pra esse mesmo trabalho (validar o corpo de uma requisição). Com `class-validator`, a classe do DTO (`@IsEmail()`, `@MinLength(8)` etc. direto nos campos) **é** a validação - uma coisa só. Com Joi, precisaríamos manter um *schema* de validação separado da classe/tipo que descreve o mesmo dado, duas fontes de verdade pra sincronizar à mão toda vez que um campo muda. Como o `ValidationPipe` global do Nest já foi desenhado pra ler `class-validator` nativamente (é literalmente o exemplo padrão da documentação oficial do framework), não fazia sentido introduzir uma segunda ferramenta pra fazer o mesmo trabalho de um jeito mais desacoplado.

📌 **Por que não usamos HATEOAS.** Também nos foi ensinado pelo professor Francisco, do IFSP Birigui, a fazer toda resposta da API carregar um bloco `_link` (ex.: `{ listar: { href, method }, criar: { href, method }, buscar: { href, method }, alterar: { href, method }, excluir: { href, method } }`), gerado por um utilitário central (`gerarLinks(req, entidade, id)`) - o quarto nível do modelo de maturidade de Richardson, o "REST completo" segundo a disciplina. Decidimos não usar isso aqui, pelos seguintes motivos:

HATEOAS ("*Hypermedia as the Engine of Application State*") resolve um problema específico: um cliente que **não conhece de antemão** a estrutura de URLs da API precisa **descobrir em tempo de execução** o que pode fazer a seguir, seguindo links que vêm dentro da própria resposta - do mesmo jeito que uma pessoa navega um site clicando em links, sem saber o endereço de cada página de cor. Isso tem valor real quando existem **vários clientes diferentes, de times diferentes, evoluindo em ritmos diferentes**, consumindo a mesma API pública (o exemplo clássico é uma API de pagamento ou uma API pública de terceiros, onde o dono da API não controla nem sabe quem está consumindo ela).

**Não é o caso deste projeto.** O CrowdAcadêmico tem **um cliente só** (o painel React), escrito pela **mesma dupla** que escreve o backend, no **mesmo repositório**, evoluindo junto. Quando um endpoint novo é criado no Nest, a pessoa que cria ele já sabe a URL - não existe momento nenhum em que o frontend "descobre" uma rota em tempo de execução, porque quem escreve o `usuarioApi.buscar(authFetch, id)` (`services/1-usuario/api/usuario.api.js`, ver §6) é a mesma pessoa que acabou de escrever o `@Get(':id')` no controller. A "descoberta de rota" já acontece - só que em tempo de desenvolvimento (a pessoa lê/escreve o código), não em tempo de execução (o app perguntando pro servidor "o que posso fazer agora?").

**O custo de adotar HATEOAS aqui seria puro, sem contrapartida:**
- Todo endpoint do sistema (hoje ~100 rotas, `§1.2`) passaria a carregar um bloco `_link` a mais em toda resposta, sem nenhum consumidor real pra ler esse bloco - o React sempre chama a URL que já sabe de cor, nunca segue um link vindo de uma resposta anterior.
- Precisaria de um utilitário central gerando esses links (equivalente ao `gerarLinks` do projeto de referência), que é **uma segunda fonte de verdade sobre quais rotas existem**, exatamente o mesmo tipo de duplicação que já evitamos ao escolher `class-validator` em vez de Joi (`§1.1`, acima) - o utilitário de link precisaria ser atualizado toda vez que uma rota mudasse, e nada garantiria que ele não ficasse desatualizado.
- O modelo de 5 links fixos por recurso (listar/criar/buscar/alterar/excluir) não cobre a maior parte das rotas reais deste projeto - `POST /arquivo/upload/iniciar` + `POST /arquivo/upload/confirmar` (fluxo em 2 passos, `§8`), `GET /dashboard/resumo` (não é CRUD de entidade nenhuma), `POST /usuario/:id/desbloquear`, `GET /usuario/:id/logins` (`§13`). Forçar essas rotas num molde de "5 links padrão" ou exigiria inventar relações de link não-padronizadas caso a caso, ou simplesmente não documentaria essas rotas via HATEOAS de jeito nenhum - custo de manutenção alto pra um ganho que ninguém usaria.
- A pergunta real que HATEOAS responde ("o que eu posso fazer a partir daqui?") já tem uma resposta mais forte neste projeto: a RLS/matriz de papel × permissão (`§4`, `DOCUMENTACAO_BD.md`). Um `_link` num JSON é só uma sugestão - o cliente pode ignorá-lo, forjá-lo, ou chamar a URL sem nunca ter visto o link. A autorização de verdade, aqui, é sempre reconferida pela RLS no momento da chamada, existindo o link ou não - então um `_link` de "você pode excluir isto" seria, na melhor das hipóteses, decorativo, e na pior, uma promessa que a RLS ainda poderia recusar (ex.: mostrar o link de excluir pra alguém que na prática não tem a permissão, porque o link foi gerado sem essa checagem).

Nenhuma dessas três escolhas é uma crítica ao que foi ensinado - a disciplina cobre os fundamentos (Nest, TypeORM, autenticação, REST, HATEOAS) que permitem justamente entender esse tipo de troca com base real, não só copiar o padrão de sala de aula pra um projeto com exigência diferente (LGPD, dado financeiro, sete papéis de RBAC, um cliente só mantido pelo mesmo time). Pra uma API pública, com múltiplos consumidores desconhecidos evoluindo em ritmos diferentes, HATEOAS é uma escolha genuinamente valiosa - só não é a escolha certa pra este projeto específico.

### 1.2 Números do código (conferidos, não estimados)

| Item | Quantidade |
|---|---|
| Arquivos `.ts` em `nest/src/` | 413 |
| Módulos Nest (`*.module.ts`) | 25 (20 de domínio + `DatabaseModule` + `StorageModule` + `ConfiguracaoValorModule` + `LoggingModule` + `AppModule`) |
| Arquivos de controller | 113 |
| Arquivos de service | 121 |
| Rotas HTTP (handlers `@Get`/`@Post`/`@Patch`/`@Delete`) | 119 |
| DTOs de request / de response | 54 / 36 |
| Converters | 17 |
| Pastas de módulo **vazias** (só `.gitkeep`) | 8 |

> Recontado em 21-09-2026. A seção 17 explica como recontar tudo isso - prefira recontar a confiar nos números acima depois de qualquer rodada de trabalho.

### 1.3 Mapa de pastas

```
nest/src/
├── main.ts                    ← bootstrap: CORS, helmet, trust proxy, ValidationPipe
├── app/                       ← AppModule, GET /health
├── commons/                   ← infraestrutura compartilhada, sem domínio próprio
│   ├── auth/                  ← formato de request.user (UsuarioAutenticado)
│   ├── configuracao/          ← leitura de valores de `configuracoes` pelo backend
│   ├── database/              ← ⭐ o coração do projeto (seção 2); também duplicidade e exclusão em uso (5.1)
│   ├── logging/               ← log de cada requisição
│   ├── seguranca/             ← cifra de CPF, validador de CPF, decorator @IsCpf, mensagem do 429
│   ├── storage/               ← abstração de armazenamento de arquivo (seção 8)
│   └── validacao/             ← erro de validação por campo, @TextoLimpo, @BooleanoDaQuery (6.1)
├── 1-usuario/ … 28-dashboard/ ← 29 pastas numeradas, uma por domínio
```

📌 **A numeração das pastas é a mesma ordem de dependência de produto usada em `PROXIMOS_MODULOS.md`** - `1-usuario` antes de `3-auth` porque autenticação precisa de conta; `12-campanha` antes de `15-atualizacao-campanha` porque atualização pendura numa campanha. **Ela não é ordem de importância nem de execução**: `25-arquivo` (número alto) é usado por `1-usuario` (número baixo).

📌 **Por que `commons/` e não `shared/`/`core/`.** O critério que separa `commons/` de uma pasta numerada é: *tem tabela própria?* `25-arquivo` tem (`arquivo`), então é módulo numerado. `commons/storage` não tem - é só o adaptador que fala com o bucket. Mesma lógica de `commons/database` (não tem tabela; tem a conexão) e `commons/seguranca` (não tem tabela; tem a cifra usada por `6-perfil-pesquisador`).

---

## 2. O núcleo: uma transação por requisição (`commons/database`)

Esta é a decisão arquitetural mais importante do backend inteiro, e a mais incomum. **Leia esta seção antes de escrever qualquer módulo novo.**

### 2.1 O problema que ela resolve

A autorização deste sistema mora na Row Level Security do Postgres (seção 4). Toda policy do banco pergunta, direta ou indiretamente, *"quem é o usuário logado?"* - via `public.id_usuario_atual()` (`03_funcoes_seguranca.sql`, bloco `[03-J]`), que por sua vez lê a variável de sessão `app.id_usuario_atual`.

Para a RLS funcionar, então, **toda query precisa rodar numa conexão onde `app.id_usuario_atual` já foi setado com o id de quem fez a requisição**. Se o backend usasse `pool.query()` solto, cada query pegaria uma conexão qualquer do pool - inclusive uma que ainda carrega o `SET` de *outro* usuário. É uma contaminação cruzada silenciosa: nada quebra, só a proteção some.

### 2.2 A solução: `GlobalDbInterceptor`

`commons/database/global-db.interceptor.ts` é registrado como `APP_INTERCEPTOR` global (declarado dentro do `DatabaseModule`, não do `AppModule` - para manter tudo que é "conexão com banco" num lugar só). Ele roda em **toda** requisição, autenticada ou não, e faz exatamente 5 coisas:

1. Tira **um client dedicado** do `Pool` (`pool.connect()`), nunca um `pool.query()` avulso.
2. `BEGIN` - abre uma transação nesse client.
3. `SELECT set_config('app.id_usuario_atual', $2, true)` - **parametrizado**, nunca `SET LOCAL` com string interpolada. O terceiro argumento `true` é o que torna o `set_config` local à transação (equivalente a `SET LOCAL`), ou seja: quando a transação termina, o valor evapora junto.
4. Cria uma instância do Kysely amarrada a **esse client específico**, via `KyselySingleConnectionDialect`, e guarda no contexto do `nestjs-cls`.
5. No final: `COMMIT` se a rota terminou bem, `ROLLBACK` se lançou qualquer erro - e `client.release()` **sempre**, nos dois casos (senão o pool esgota silenciosamente, e não na hora, o que é pior de diagnosticar).

📌 **Rota anônima não pula o interceptor.** Quando não há `request.user`, o interceptor seta `''` (string vazia) em vez de pular o passo 3 - `id_usuario_atual()` então devolve `NULL`, que é exatamente o que "anônimo de verdade" significa para as policies. Pular o passo deixaria a variável com o valor da *requisição anterior* naquela conexão.

📌 **Ordem no pipeline do Nest.** Guards rodam **antes** de interceptors. É por isso que o `AuthGuardJwt` (global, seção 3) consegue resolver `request.user` a tempo de o interceptor encontrá-lo já pronto no passo 3. Essa ordem não é acidente - é o que faz o desenho inteiro fechar.

📌 **Por que `nestjs-cls` e não `Scope.REQUEST` do Nest.** `Scope.REQUEST` contaminaria toda a árvore de injeção que toca o banco: cada módulo novo teria que lembrar de marcar o escopo certo, e esquecer produziria um bug silencioso. Com `AsyncLocalStorage`, o contexto viaja por fora - nenhum service precisa saber que ele existe. (Registrado em `PENDENCIAS e correcoes.md`, item 5.)

### 2.3 `DatabaseService` - o único ponto de acesso

```ts
const db = this.database.getDb();   // Kysely<DB> já amarrado à transação desta requisição
```

`commons/database/database.service.ts` existe para que **nenhum service precise saber** que `nestjs-cls`, `AsyncLocalStorage` ou um `PoolClient` específico existem. Se `getDb()` for chamado fora do pipeline HTTP (num script solto, por exemplo), ele lança um erro explícito em vez de devolver `undefined`.

**Regra:** nenhum service do projeto abre `new Pool(...)`, `pool.connect()` ou `pool.query()` próprio. As únicas exceções, ambas deliberadas e comentadas no código, são `DatabaseModule.onModuleInit()` e `HealthController` (que precisam testar a conexão crua, não a transação da requisição), e `aplicar-migrations.script.ts` (que nem é um provider do Nest).

### 2.4 `KyselySingleConnectionDialect` - e as duas armadilhas que ele cria

`commons/database/kysely-single-connection.dialect.ts` é um `Dialect` customizado do Kysely cujo único trabalho é: *executar SQL neste `PoolClient` aqui, e não gerenciar transação nenhuma*. Os métodos `beginTransaction` / `commitTransaction` / `rollbackTransaction` / `releaseConnection` do driver são **no-op de propósito** - a transação já está aberta por fora.

🧩 **Armadilha 1 - nunca chame `db.transaction()`.** Não há savepoint implementado; a chamada silenciosamente não faria nada. Se você precisa desfazer algo no meio de uma operação, ou use `RAISE EXCEPTION` no banco (padrão que `05_regras_negocio.sql` já usa em todo lugar, e o interceptor faz o `ROLLBACK` de verdade), ou use `SAVEPOINT` via SQL cru - ver armadilha 2.

🧩 **Armadilha 2 - `try/catch` em volta de uma query NÃO desfaz um erro de Postgres.** Esta é a mais perigosa, e já causou um bug real no projeto (documentado em comentário dentro de `auth.service.login.ts`). Um erro de Postgres deixa a **transação inteira em estado abortado** até um `ROLLBACK` de verdade. Pegar a exceção no lado do JavaScript e seguir chamando queries no mesmo `db` não desfaz isso: as próximas queries até parecem funcionar, mas o `COMMIT` final do interceptor vira silenciosamente um `ROLLBACK` (é o que o Postgres faz quando se pede `COMMIT` numa transação abortada). Resultado: **a resposta HTTP volta 200, com dado que parece certo - e nada foi gravado.**

  O jeito certo, quando um trecho precisa poder falhar sem derrubar a requisição, é `SAVEPOINT` via `sql` cru. Há dois exemplos reais disso em `3-auth/service/auth.service.login.ts`:

  ```ts
  await sql`SAVEPOINT sp_listar_papeis`.execute(db);
  try {
    /* chamada que pode falhar se a migração ainda não rodou no banco */
  } catch {
    await sql`ROLLBACK TO SAVEPOINT sp_listar_papeis`.execute(db);
    return [];
  }
  ```

  Os dois casos (`listarPapeis` e `buscarSuspensao`) existem pelo mesmo motivo: eles tocam objetos de banco (`listar_papeis_usuario()`, colunas `suspenso_ate`/`motivo_suspensao`) que só existem depois de alguém colar `ATUALIZAR O SUPABASE.sql` no SQL Editor do Supabase - ver `PENDENCIAS e correcoes.md`, item 22. Sem o savepoint, num banco desatualizado, o **login inteiro** quebrava.

⚠️ **`.stream()` não é suportado.** O dialect lança erro explícito em `streamQuery`. Nenhum módulo usa hoje; se algum precisar, vai exigir um driver diferente.

### 2.5 `DatabaseModule` - o health-check que impede a RLS de sumir

O `Pool` é criado uma única vez, como provider (`PG_POOL`), a partir de `DATABASE_URL`. E `onModuleInit()` roda um `SELECT current_user` na subida: **se a conexão não for exatamente `app_nestjs`, a aplicação não sobe.**

📌 **Por que isso é crítico.** RLS não se aplica a superusuário nem ao dono da tabela. Se alguém apontar o `.env` para o usuário `postgres` por engano, tudo continua funcionando perfeitamente - e a autorização inteira do sistema desaparece, sem um único erro. O health-check transforma uma falha silenciosa e catastrófica numa falha barulhenta no boot. (`PENDENCIAS e correcoes.md`, item 8.)

`DatabaseModule` é `@Global()`, então qualquer módulo injeta `DatabaseService` sem importá-lo. Ele também registra os dois provedores globais de infraestrutura: o `GlobalDbInterceptor` (`APP_INTERCEPTOR`) e o `PostgresExceptionFilter` (`APP_FILTER`, seção 5).

### 2.6 `db.types.ts` - a forma das tabelas para o Kysely

`commons/database/db.types.ts` (537 linhas) descreve as tabelas para o Kysely. Ele é **escrito à mão**, espelhando `01_extensoes_enums_tabelas.sql`, e cobre só as tabelas que os módulos existentes tocam - não o banco inteiro.

Além das interfaces de tabela, ele exporta os ENUMs do banco como *const arrays* + tipo derivado, e são esses que os DTOs usam em `@IsIn(...)`:

```ts
export const MODELOS_CAMPANHA = ['all-or-nothing', 'flexivel'] as const;
export type ModeloCampanha = (typeof MODELOS_CAMPANHA)[number];
```

📌 **Uma fonte só para o ENUM.** O DTO valida contra a mesma constante que tipa a coluna. Adicionar um valor no ENUM do banco e esquecer de atualizar o DTO vira erro de compilação, não um 500 em produção.

📌 **Conferido contra o banco de verdade (28-09-2026).**
- **Em palavras simples:** o `db.types.ts` é a "planta" das tabelas que o Nest usa para não errar nome de coluna. Ela é desenhada à mão, então pode ficar diferente do banco real sem ninguém perceber. Agora uma ferramenta tira uma "foto" do banco de verdade, e um teste compara a planta com a foto: se alguém mudar uma coluna no banco e esquecer a planta, o teste fica vermelho.
- **Decisão:** o `db.types.ts` manual continua sendo o que a aplicação usa. Ao lado dele fica `db.types.generated.ts`, gerado pelo kysely-codegen a partir dos arquivos 01 a 08, e uma suíte de teste do banco (a de conferência de tipos, na pasta local de testes do banco) compara os dois a cada rodada. Ela falha se o manual tiver coluna que não existe, tipo diferente ou lista de valores diferente da do banco. Para gerar de novo: o script de geração de tipos da pasta de testes do banco, ou `npm run db:codegen` no `nest/` com o `.env` apontando para um banco.
- **Motivo:** trocar direto pelo gerado quebrava 61 pontos de compilação, quase todos pela mesma causa: colunas com `DEFAULT` e sem `NOT NULL` (`criado_em`, `ativo`...), que o banco aceita nulas e o manual declara "nunca nulo". A conferência dá a proteção que importa (coluna errada vira teste vermelho) sem mexer em 61 lugares nem no banco.
- **Caso-limite aceito:** 34 colunas continuam com nulidade diferente, listadas como aviso pela suíte. Colunas de texto com `CHECK (col IN (...))` aparecem como texto livre no gerado (o gerador não lê `CHECK`); a suíte confere a lista do manual contra o `CHECK` do 01. O arquivo gerado fica fora do lint.

### 2.7 `paginacao.util.ts` - teto de segurança, não paginação de tela

```ts
const resultado = await paginar(query, { pagina, tamanho });
// → { dados, total, pagina, tamanho }
```

Monte a query normalmente (`select`/`where`/`orderBy`) e troque o `.execute()` final por `paginar(...)`. Ele aplica `LIMIT`/`OFFSET` e roda a contagem.

📌 **`TAMANHO_PAGINA_PADRAO` e `TAMANHO_PAGINA_MAXIMO` são 500, deliberadamente altos.** Hoje isso é um **teto de segurança** ("nenhum `SELECT` sem limite, nunca mais"), não paginação exposta na tela: o `GenericTable` do React continua buscando a lista inteira e paginando no navegador, o que funciona bem para tabelas pequenas. O comentário no arquivo é explícito sobre quando mudar: **quando um módulo de alto volume existir de verdade** (`22-contribuicao`, `26-notificacao`), *esse* módulo escolhe um tamanho pequeno e o React ganha controles de página - não antes, porque não faz sentido construir paginação contra 17 linhas de teste. `27-log-auditoria` já é o primeiro a fazer isso, com `TAMANHO_PADRAO_LOG = 20` próprio.

🧩 **As duas queries de `paginar()` são sequenciais, nunca `Promise.all`.** O comentário registra o achado: o driver `pg` emite *"Calling client.query() when the client is already executing a query is deprecated"*. Como há **uma conexão só por requisição** (é isso que faz o `set_config` da RLS funcionar), as duas queries nunca rodavam em paralelo de verdade - o driver só enfileirava por baixo dos panos, e essa fila implícita é justamente o comportamento que o `pg` vai remover. `await` sequencial custa o mesmo tempo total, sem depender de algo que vai sumir.

`PaginacaoQueryDto` (`commons/database/dto/paginacao.query.dto.ts`) é a base que os DTOs de listagem estendem - `@Type(() => Number)` converte a query string antes do `class-validator` rodar. `PorCampanhaQueryDto` (mesma pasta) acrescenta o `idCampanha` obrigatório, para as listas que são sempre de uma campanha (atualizações, comentários).

Usam `paginar()` hoje: `1-usuario`, `6-perfil-pesquisador`, `8-area-conhecimento`, `9-tipo-link`, `10-motivo-denuncia`, `11-configuracoes`, `12-campanha`, `15-atualizacao-campanha`, `17-comentario`, `27-log-auditoria`.

### 2.8 `commons/logging` - log de requisição com ID (05-09-2026)

Até esta data, **não existia nenhum log de requisição neste projeto** - só logs pontuais tipo "conectado ao banco" (`DatabaseModule.onModuleInit`). Um erro relatado como "deu erro às 14:32" não tinha como virar "achei os 8 logs daquela requisição específica" - item 6 de uma lista de pendências, resolvido no mesmo dia em que foi levantado.

**De onde vem o ID.** Não é gerado num arquivo próprio - é o próprio `nestjs-cls` que já sustenta a seção 2.2 inteira. `ClsModule.forRoot()` (`database.module.ts`) ganhou duas opções novas dentro de `middleware`:

```ts
ClsModule.forRoot({
  global: true,
  middleware: { mount: true, generateId: true, idGenerator: () => randomUUID() },
}),
```

`generateId: true` liga a geração; `idGenerator` diz **como** gerar (o pacote não vem com um gerador padrão embutido - sem essa função, `generateId: true` sozinho não produz nada). O id fica guardado sob uma chave reservada do próprio `nestjs-cls` (não uma chave nossa), lida em qualquer lugar do código com `cls.getId()` - mesma mecânica de `AsyncLocalStorage` "por fora" que já guarda o Kysely da requisição (seção 2.2), só que essa parte já vem pronta no pacote, não precisou ser escrita.

**Quem lê o ID e decide o que logar: `RequestLoggerMiddleware`** (`commons/logging/request-logger.middleware.ts`), aplicado a toda rota em `AppModule.configure()`. Uma linha de log por requisição, no formato `[<id>] MÉTODO /rota STATUS - Xms`, em nível `log`/`warn`/`error` conforme o status HTTP (< 400 / 400-499 / ≥ 500).

🧩 **Por que é um `NestMiddleware`, não um interceptor - e isso importa.** Testado na prática: o status HTTP final de uma resposta (`res.statusCode`) só fica **definitivo** depois que o Nest termina de serializar a resposta de sucesso, ou depois que um exception filter decide o código de erro - um interceptor comum roda cedo demais nesse processo pra garantir o valor certo sempre. O evento nativo do Express `res.on('finish')` resolve isso sem ambiguidade: só dispara depois que a resposta já foi enviada por completo pro cliente, com o status code já fechado - é o mesmo mecanismo por trás de bibliotecas de log de requisição consagradas no ecossistema Node (`morgan`, por exemplo).

📌 **Ordem importa, e já foi verificada ao vivo, não só no papel.** O middleware do `nestjs-cls` (que gera o id) precisa rodar **antes** de `RequestLoggerMiddleware` (que só lê o id já pronto) - `DatabaseModule` é importado antes de `LoggingModule` em `AppModule`, e o teste ao vivo abaixo confirma que a ordem está certa: o id aparece de verdade no log, nunca `undefined`.

**Testado de verdade, não só compilado:** subiu o servidor, `GET /health` → `[dc7235a8-...] GET /health 200 - 216ms`; `GET /rota-inexistente` → mesmo formato, em `WARN`, `404`, id **diferente** do anterior (cada requisição gera o seu). `tsc --noEmit` e `eslint` limpos.

⚠️ **O que isto NÃO é:** não é observabilidade completa (não manda log pra nenhum serviço externo, não sobrevive a um restart do processo, não tem retenção configurada) - é só a peça mínima que faltava pra correlacionar "um erro aconteceu" com "todas as linhas de log daquela requisição específica", dentro do console do próprio processo. Suficiente pro estágio atual do projeto; se um dia o volume de log justificar, a evolução natural é mandar essas linhas pra um serviço de log agregado, sem precisar mudar nada de como o id é gerado ou propagado.

---

## 3. Autenticação (`3-auth`)

Autenticação própria, JWT com par access + refresh, refresh token com **rotação**. Nada de Supabase Auth.

### 3.1 As duas metades do token

| | Access token | Refresh token |
|---|---|---|
| Formato | JWT assinado (`JWT_SECRET`) | `"<id_sessao>.<segredo>"` - texto puro, não é JWT |
| Validade | `JWT_ACCESS_EXPIRES_IN` (padrão `15m`) | `configuracoes.refresh_token_dias_validade` (padrão 30, configurável pelo Painel Admin desde 04-09-2026) |
| Onde é validado | `AuthGuardJwt`, em memória - **nunca consultado contra o banco** | `bcrypt.compare` do segredo contra `sessao.refresh_token_hash` |
| Claims | `sub` (id do usuário) e `sid` (id da sessão) | - |

📌 **Por que o refresh token tem o id da sessão colado na frente.** O `id_sessao` serve só para achar a linha rápido (índice de PK). A validade de verdade é **sempre** o `bcrypt.compare` do segredo. O comentário em `auth.constants.ts` é explícito: nunca confiar no `id_sessao` sozinho para revogar ou renovar - ele é sequencial e trivial de adivinhar. É exatamente por isso que `AuthServiceLogout` confere o segredo antes de revogar: sem essa checagem, adivinhar um id derrubaria a sessão de outra pessoa.

📌 **Por que o JWT carrega `sid`.** O access token nunca é comparado contra a tabela `sessao` - então, sem o `sid`, seria impossível saber qual linha de `sessao` corresponde à aba atual. É isso que permite a tela "Sessões ativas" marcar *"esta sessão"* e excluí-la de *"encerrar todas as outras"*. O formato de `request.user` vive em `commons/auth/usuario-autenticado.interface.ts` (e não em `3-auth/`) de propósito: tanto o `AuthGuardJwt` quanto o `GlobalDbInterceptor` precisam dele, e infraestrutura apontando para uma feature ficaria invertido.

### 3.2 Os dois guards

**`AuthGuardJwt`** - global (`APP_GUARD`), roda em toda rota. **Não bloqueia nada por conta própria.** Sem cabeçalho `Authorization`, deixa passar como anônimo (`request.user` fica `undefined`). Com um `Bearer` válido, preenche `request.user = { idUsuario, idSessao }`. Com um token **presente mas inválido/expirado**, lança 401 - porque isso é sempre erro: o cliente pensa que está autenticado e não está, o que é diferente de não mandar token nenhum.

**`AuthGuardRequireAuth`** - global também (`APP_GUARD`, registrado depois da `AuthGuardJwt`, 27-09-2026): **toda rota exige login, menos as marcadas com `@Publico()`** (`commons/auth/publico.decorator.ts`). Só confere se existe sessão; devolve 401 *"Você precisa estar logado para fazer isso."* se não existir. Rota nova nasce fechada: esquecer a marcação deixa a rota fechada, nunca aberta. Antes era aplicado rota a rota com `@UseGuards(AuthGuardRequireAuth)` (84 repetições), e foi assim que o `POST /usuario` ficou aberto a anônimo sem ninguém notar. As 29 rotas `@Publico()` são login, cadastro, renovação e saída de sessão, verificação de e-mail, `health`, as listas e leituras públicas de catálogo, o termo vigente, as configurações públicas, o avatar e as leituras que a página pública vai usar (campanha, orçamento, cronograma, atualizações, comentários, perfil de pesquisador); nas de login opcional, a `AuthGuardJwt` continua reconhecendo quem mandou token. Na troca, as 119 rotas foram chamadas sem login antes e depois: nenhuma diferença de status nem de conteúdo (roteiro de teste que chama cada rota sem login e compara as respostas). O mesmo guard barra, com 403 e `codigo: "TERMO_PENDENTE"`, quem tem versão nova do Termo de Uso para aceitar (RF-015, ver seção 19); só passam as rotas `@Publico()` e as marcadas com `@LiberadoComTermoPendente()`.

📌 **Por que existe um guard que só confere login.** Sem ele, um anônimo tentando `PATCH /usuario/5` esperaria a RLS devolver 0 linhas e receberia um erro confuso lá no fim. O guard pega o caso mais comum - *nem logado* - cedo e com mensagem clara. O comentário no código deixa a fronteira explícita: **este guard não sabe nada sobre papel/permissão**; quem já está logado mas sem a permissão certa nunca cai aqui, cai num 403 vindo da RLS.

### 3.3 Os fluxos

**Login** (`POST /auth/login` → `auth.service.login.ts`), em ordem:
1. Busca `id_usuario`, `senha_hash` e `bloqueado_ate` por e-mail. Esta é a **única query do projeto inteiro que lê `senha_hash`** - de propósito, e nunca via `USUARIO_COLUNAS_SELECT` (que exclui a coluna para todos os outros services).
2. Usuário inexistente → `401 Credenciais inválidas.` Como `pol_usuario_select` já esconde `deletado = TRUE` até de anônimo, conta excluída cai no mesmo erro - não vaza se a conta existe.
3. `bloqueado_ate` no futuro → 401 com a data formatada (bloqueio **automático**, por senha errada demais).
4. Suspensão de **moderação** (`suspenso_ate`, manual, com motivo) → **403**, não 401: a pessoa não errou credencial nenhuma, a conta é que está impedida, e precisa saber por quê. (Consulta protegida por `SAVEPOINT`, ver §2.4.)
5. `bcrypt.compare`. Falhou → `SELECT public.registrar_falha_login(...)` (função `SECURITY DEFINER`, porque roda antes de existir sessão) e 401.
6. Passou → `SELECT public.registrar_login_sucesso(...)`, emite o par de tokens com `origem = 'login'`, e devolve `{ accessToken, refreshToken, usuario, papeis }`.

📌 **Data formatada dentro da mensagem de erro.** As duas mensagens de bloqueio/suspensão são as **únicas** do projeto que embutem data no texto do `throw` (todo o resto formata no React). `formatarDataHoraBr()` usa `timeZone: 'America/Sao_Paulo'` explícito, não o fuso do processo Node - o servidor pode rodar em UTC mesmo com público brasileiro. O motivo está registrado no comentário: `toISOString()` cru ("...T00:28:27.382Z") não significa nada para quem não programa.

**Refresh** (`POST /auth/refresh`): faz o parse de `"<id>.<segredo>"`, busca a sessão **com `.forUpdate()`**, valida (não revogada, não expirada, `bcrypt.compare` bate), **revoga a sessão usada** (`revogado_em`) e emite um par novo com `origem = 'refresh'`.

🧩 **O `.forUpdate()` corrige uma corrida real.** O comentário registra o sintoma: linhas duplicadas em `sessao`, com `criado_em` idêntico até o milissegundo e nenhuma revogada. Duas renovações concorrentes com o **mesmo** refresh token (várias abas, ou uma tela que dispara N buscas de uma vez com o token vencido) liam `revogado_em = NULL` ao mesmo tempo, as duas passavam, e as duas criavam sessão nova. Como cada requisição já roda na própria transação, `FOR UPDATE` trava a linha até a primeira terminar - a segunda só lê depois, já vê `revogado_em` preenchido, e cai corretamente em *"Refresh token inválido ou expirado."*.

📌 **Rotação é a defesa contra roubo de token.** O token usado é revogado imediatamente; um refresh token roubado depois de consumido não vale mais nada.

**Logout** (`POST /auth/logout`): confere o segredo e marca `revogado_em`. Sessão inexistente devolve sucesso, não erro - do ponto de vista do logout, o objetivo (a sessão não vale mais nada) já está satisfeito.

**Cadastro público** (`POST /auth/cadastro` → `auth.service.register.ts`): reaproveita `UsuarioServiceCreate` (a mesmíssima criação que `POST /usuario` do admin usa) e soma o que só faz sentido no auto-cadastro - grava o aceite do termo **ativo** via `registrar_aceite_termo()` (o id do termo é resolvido pelo servidor, **nunca** aceito do corpo da requisição), gera o token de verificação de e-mail em `verificacao_email` (validade em `configuracoes.verificacao_email_horas_validade`, padrão 24h, também configurável pelo Painel Admin desde 04-09-2026), e já devolve tokens de sessão (quem se cadastra termina logado).

📌 **Por que estes dois viraram configuráveis, e o custo de bcrypt não.** `refresh_token_dias_validade` e `verificacao_email_horas_validade` eram constantes fixas em `auth.constants.ts` com um comentário dizendo "parâmetro técnico, não regra de negócio" - revisto em 04-09-2026: os dois são só **janelas de tempo de produto** (por quanto tempo alguém continua logado, por quanto tempo um link de verificação vale), mesmo tipo de número que `configuracoes.bloqueio_login_minutos` já era. Lidos via `ConfiguracaoValorService`, com fallback pro padrão hardcoded se a chave sumir/for desativada - mesmo padrão usado em `25-arquivo` (ver §8.6). `CUSTO_BCRYPT_REFRESH_TOKEN` continua fixo de propósito: é parâmetro de segurança (custo de hash), não regra de produto - baixar isso sem entender a troca enfraquece a defesa contra força bruta offline.

⚠️ **`tokenVerificacaoEmailDev`.** Como `4-mail` não existe, ninguém envia o e-mail. A linha em `verificacao_email` é criada de qualquer jeito, e o token só viaja no corpo da resposta **fora de produção** (`NODE_ENV !== 'production'`). Em produção ele simplesmente não é devolvido - a escolha declarada foi não fingir que um e-mail foi mandado.

**Sessões** (`GET /auth/sessoes`, `DELETE /auth/sessoes`, `DELETE /auth/sessoes/:id`): lista/encerra sessões, usando o `sid` do próprio JWT para marcar qual é a atual.

### 3.4 Rate limit

`ThrottlerModule` é registrado uma vez só, em `app.module.ts` (é `@Global()`: um segundo `forRoot()` em outro módulo sobrescrevia o primeiro, já foi bug). O limite de verdade de cada rota vem do `@Throttle()` no próprio controller: `POST /auth/login`, `POST /auth/cadastro` e `GET /usuario/eu/exportar-dados` (este por conta, não por IP, ver `1-usuario`).

📌 **A resposta 429 sai em português, com o tempo de espera** (27-09-2026): o `errorMessage` do `ThrottlerModule` aponta para `commons/seguranca/mensagem-limite-tentativas.util.ts`, que lê `timeToBlockExpire` (segundos, o mesmo número do cabeçalho `Retry-After`) e devolve "Muitas tentativas em sequência. Tente de novo em 40 segundos" (ou minutos, ou horas). Antes saía o padrão do pacote, em inglês. Vale para toda rota com `@Throttle()`.

📌 **Por que só nessas duas.** `bcrypt` é lento **de propósito** (~100ms por operação). Sem limite, derrubar o servidor por CPU é barato: basta mandar muitas requisições em paralelo, com senha errada e sem precisar de conta válida. Login é o endpoint público que dispara `bcrypt.compare` sem exigir login antes; cadastro dispara `bcrypt.hash` e, além do custo de CPU, é o tipo de endpoint público que atrai spam/automação sem exigir **nada** antes.

📌 **Isto é ortogonal ao bloqueio por conta.** `configuracoes.limite_tentativas_login` + `registrar_falha_login()` já bloqueiam **uma conta** após N falhas. O throttler protege **o servidor**: um ataque espalhado por várias contas diferentes não aciona o bloqueio do banco, mas aciona este.

📌 **Limite diferente fora de produção:** 5/60s em produção, 30/60s em dev. O motivo está no comentário: o botão `<dev>` "Entrar como" do front dispara um `POST /auth/login` por clique, com 6 contas no dropdown - testar todas em menos de um minuto já esbarrava nos 5/60s e travava, em silêncio, **todos** os logins (o limite é por IP, não por conta).

---

## 4. Autorização: a RLS do Postgres é a única fonte de verdade

**Nenhum guard do NestJS verifica permissão por nome. Nem hardcoded, nem gerada.** Isto é uma decisão consciente, registrada em `PENDENCIAS e correcoes.md`, item 7 - e é **diferente** da sugestão original que estava naquele item (espelhar `tem_permissao()` no lado da aplicação).

### 4.1 A divisão de responsabilidade

| Camada | Responde a pergunta | Onde |
|---|---|---|
| `AuthGuardJwt` | *Quem é você?* | `3-auth/guards/` |
| `AuthGuardRequireAuth` | *Você está logado?* | `3-auth/guards/`, global (menos `@Publico()`) |
| **RLS do Postgres** | ***Você pode fazer isto com esta linha?*** | `04_rls_policies.sql` |
| Triggers de `05` | *Esta operação é válida segundo as regras de negócio?* | `05_regras_negocio.sql` |
| Service do Nest | *Como traduzir a recusa acima em HTTP?* | seção 5 |

### 4.2 Por que não duplicar a autorização no Nest

O raciocínio registrado no item 7 tem dois pontos, e o segundo é o mais forte:

1. **Espelhar criaria exatamente a segunda fonte de verdade que se queria evitar.** Mesmo gerando a lista de permissões automaticamente na subida, existiriam **dois** pontos decidindo "pode ou não pode" - o guard *e* a policy - livres para divergir com o tempo.
2. **A RLS quase nunca é só "tem a permissão X".** Ela é quase sempre *"tem a permissão X **OU** é o dono **OU** o status da campanha permite"*. Um guard roda **antes** de saber se a condição extra se aplica - ele não tem a linha em mãos. Reproduzir isso no Nest significaria reimplementar as condições de negócio de 100+ policies em TypeScript.

**O custo aceito:** a negação só é descoberta na hora da query. Mitigado pelo `AuthGuardRequireAuth`, que pega o caso mais comum (nem logado) antes disso.

### 4.3 Como a recusa chega ao service

A RLS recusa de **duas formas diferentes**, e o service precisa distinguir:

| Operação | O que a RLS faz ao recusar | Como o service percebe |
|---|---|---|
| `INSERT` | Lança erro `42501` (*new row violates row-level security policy*) | Exceção do driver `pg` |
| `UPDATE` / `DELETE` | **Não lança nada** - a linha simplesmente não é vista, e a operação afeta **0 linhas** | `executeTakeFirst()` devolve `undefined` |

Daí nasce o idioma mais repetido do projeto - presente em ~38 arquivos:

```ts
const linha = await db.updateTable('campanha').set({...})
  .where('id_campanha','=',id).returning(COLUNAS).executeTakeFirst();

if (!linha) {
  // 0 linhas: ou não existe, ou a RLS bloqueou. SELECT à parte para diferenciar.
  const existe = await db.selectFrom('campanha').select('id_campanha')
    .where('id_campanha','=',id).executeTakeFirst();
  if (!existe) throw new NotFoundException('Campanha não encontrada.');
  throw new ForbiddenException('Sem permissão para aprovar esta campanha.');
}
```

📌 **`commons/database/distinguir-404-ou-403.util.ts`.** O bloco acima (UPDATE/DELETE que afetou 0 linhas: "não existe" ou "a RLS bloqueou") vive num helper, `return await distinguir404ou403(db, 'campanha', { id_campanha: id }, 'Campanha não encontrada.', 'Sem permissão para aprovar esta campanha.')`, usado em 26 services. O 3º argumento é um **objeto de filtro**: chave simples (`{ id_campanha: id }`), composta (`{ id_usuario, id_papel }`) ou chave mais condição (`{ id_usuario, deletado: false }`); todas as colunas entram com `AND`. A mensagem 403 é passada inteira (não um template), porque alguns chamadores misturam permissão com regra de negócio. Usa `sql.table`/`sql.ref` (`SELECT 1 ... LIMIT 1`) em vez do query builder tipado, cujos genéricos não resolvem com tabela abstrata. O `return` explícito é o que faz o TypeScript estreitar `linha` depois do `if`. Fica fora de propósito `campanha.service.submit` (lê `status` para escolher entre 2 mensagens 403). Os que já leem a linha antes do write (`comentario.update`, `termo-uso.ativar/excluir`) já discriminam sem SELECT extra.

📌 **`excluirOu404ou403` (mesmo arquivo, 27-09-2026).** O "excluir" inteiro de um registro que nada mais referencia: DELETE pelo filtro e, se nada foi apagado, `distinguir404ou403`. Usado pelos serviços de remover de configuração, item de orçamento, marco, link de atualização, link acadêmico, papel × permissão e usuário × papel (cada um virou uma chamada só). Registro que outras tabelas podem estar usando vai por `excluirComContagemDeUso` (§5.1). "Deixar de seguir" fica de fora: responde sempre 404, de propósito.

📌 **Por que o `SELECT` extra funciona como discriminador.** Só funciona quando a policy de `SELECT` daquela tabela é mais permissiva que a de escrita - o que é o caso geral aqui (`pol_arquivo_select` é `USING (TRUE)`, `pol_campanha_select` libera por status). Onde a policy de `SELECT` for tão restritiva quanto a de escrita, esse padrão devolve 404 para um caso que na verdade é 403; nesse cenário, 404 é a resposta mais honesta mesmo (a linha, para aquele usuário, de fato não existe).

`arquivo.service.remove.ts` mostra a versão mais completa desse idioma, com **três** desfechos: não existe → 404; já estava inativo → sucesso silencioso (remoção é idempotente, repetir não é erro); existe e está ativo mas o `UPDATE` não pegou → 403.

### 4.4 A única exceção - e por que ela não contradiz a regra

`6-perfil-pesquisador` **pergunta ao banco** se o usuário tem uma permissão:

```ts
const r = await sql<{ tem_permissao: boolean }>`
  SELECT public.tem_permissao('perfil_pesquisador_visualizar_sensivel') AS tem_permissao
`.execute(db);
```

📌 **Isto não é uma segunda fonte de verdade - é a mesma fonte, consultada.** O Nest não decide nada: ele pergunta à função `tem_permissao()` do próprio Postgres, que lê `id_usuario_atual()` do contexto de sessão já setado pelo interceptor. A lista de permissões continua morando só no banco.

📌 **Por que a RLS sozinha não resolve este caso.** A pergunta aqui é *"esta resposta pode conter o CPF decifrado, ou o campo vai como `null`?"* - mascaramento **de coluna**, não filtro de **linha**. RLS filtra linhas; ela não tem como devolver a mesma linha com um campo apagado dependendo de quem pergunta. O perfil de pesquisador é público de propósito (`pol_perfil_select` usa `usuario_visivel()`, não filtra por dono) - qualquer sessão consulta qualquer perfil; o que muda por dono/permissão é só se o CPF sai decifrado ou vira `null`.

📌 **Dono sempre vê o próprio CPF**, sem precisar da permissão - mesma lógica de "ver o próprio e-mail". A checagem de permissão só entra quando quem pergunta **não** é o dono.

O converter (`perfil-pesquisador.converter.ts`) recebe `cpfDecifrado` como **parâmetro separado**, nunca lido de dentro da entity: decidir *se* decifra é responsabilidade do service, não do converter.

---

## 5. Tratamento de erro: como erro de Postgres vira status HTTP

### 5.1 `PostgresExceptionFilter` - a rede de segurança global

`commons/database/postgres-exception.filter.ts`, registrado como `APP_FILTER`. Ele deixa qualquer `HttpException` passar intacta (services que já trataram o erro localmente não são afetados) e só traduz o que chegou cru do driver.

**Faixas de ERRCODE customizado** (os `RAISE EXCEPTION` com ERRCODE customizado de `05_regras_negocio.sql` - tabela completa em `DOCUMENTACAO_ERRCODE.md`), reconhecidas pelo **prefixo de 2 dígitos**:

| Prefixo | Categoria | HTTP |
|---|---|---|
| `90xxx` | Validação de dado/negócio | `400 Bad Request` |
| `91xxx` | Conflito de estado | `409 Conflict` |
| `92xxx` | Autorização negada por regra de negócio (não RLS) | `403 Forbidden` |
| `93xxx` | Limite de taxa | `429 Too Many Requests` |

**SQLSTATE nativos do Postgres:**

| Código | Significado | HTTP | Mensagem |
|---|---|---|---|
| `23505` | unique_violation | 409 | mensagem por índice violado (`commons/database/mensagens-duplicidade.constants.ts`, pelo `erro.constraint`), com `campos` quando o índice corresponde a um campo do formulário; índice fora do mapa: "Já existe um registro com estes dados." |
| `23503` | foreign_key_violation | 400 | "Um dos itens escolhidos não existe mais (pode ter sido excluído). Recarregue a página e tente de novo." |
| `23502` | not_null_violation | 400 | "Falta preencher um campo obrigatório.", com `campos` apontando a coluna vazia (`erro.column`, em camelCase) |
| `23514` | check_violation | 400 | mensagem por regra violada (`commons/database/mensagens-regra-violada.constants.ts`, pelo `erro.constraint`), com `campos` quando a regra corresponde a um campo; regra fora do mapa: "Um dos valores informados está fora do permitido. Confira os campos e tente de novo." |
| `42501` | **RLS violation** | **403** | "Sem permissão para esta operação." |
| `P0001` | `RAISE EXCEPTION` sem ERRCODE | 400 | mensagem original da função |

📌 **A mensagem das faixas `90`-`93` é a mensagem original da função do banco**, repassada literalmente. Isso vale a pena porque essas mensagens foram escritas para o usuário final ("Duração da campanha fora do intervalo configurado"), não para o desenvolvedor.

📌 **`P0001` vira 400, e o comentário justifica:** sem ERRCODE customizado não dá para saber se é permissão, validação ou conflito - 400 com a mensagem original é o mais honesto possível. Sobram nessa situação as funções fora de `05` que ainda não ganharam ERRCODE próprio (ex.: `excluir_conta_usuario()`, em `03_funcoes_seguranca.sql`).

📌 **O corpo de erro traz `codigo`.** O filtro devolve `{ statusCode, codigo, message, dados?, campos? }`: `statusCode` e `message` como sempre, `codigo` é o SQLSTATE (`9xxxx` de regra de negócio ou os nativos `23505`, `23503`, `23502`, `23514`, `42501`, `P0001`), e `dados` só aparece se o `RAISE` mandou um `DETAIL` em JSON. `campos` (`{ <campo>: [mensagens] }`) aparece na duplicidade ligada a um campo e em todo 400 de validação de DTO (§6.1): é o que o React usa para mostrar o erro embaixo do campo certo. O nome da constraint violada não vai no corpo. O front distingue a regra pelo código estável em vez do texto da mensagem. Contrato completo em `DOCUMENTACAO_ERRCODE.md`, seção "Contrato do corpo de erro da API".

📌 **Duplicidade com mensagem por índice (27-09-2026).** O Postgres informa em `erro.constraint` qual índice ou constraint único foi violado. O filtro procura esse nome em `DUPLICIDADE_POR_INDICE_UNICO` (`commons/database/mensagens-duplicidade.constants.ts`), que guarda a mensagem e, quando existe, o `campo` do formulário. É o **único** lugar do sistema que trata duplicidade: nenhum service tem `catch` de 23505 (os 7 que tinham foram limpos, só os ramos de 42501 ficaram). Estão no mapa os códigos e nomes dos catálogos (inclusive os três índices de nome normalizado do [02-C-1], com o aviso de que acentos, maiúsculas e espaços não contam como diferença), chave de configuração, versão de termo, nome de papel, e-mail, CPF e perfil repetido, e as repetições que um usuário comum pode provocar (seguir, denunciar, comentar duas vezes). Módulo novo com `UNIQUE` novo acrescenta uma linha no mapa.

📌 **Excluir item de catálogo em uso diz onde e quantas vezes (27-09-2026).** Área do conhecimento, tipo de link e motivo de denúncia não têm `CASCADE` de propósito: excluir um item em uso falha com 23503. Antes, cada serviço devolvia 409 com texto fixo; agora a mensagem traz a contagem ("em uso em 2 campanhas", "em 4 perfis e 1 recompensa"), montada por `commons/database/mensagem-exclusao-em-uso.util.ts`. Os três serviços de remover chamam o mesmo helper, `excluirComContagemDeUso` (`commons/database/excluir-com-contagem-de-uso.util.ts`): ele faz o DELETE, devolve 404 ou 403 quando nada foi apagado e, no 23503, descobre sozinho pelo catálogo do Postgres (`pg_constraint`) quais tabelas apontam para o item, conta cada uma e monta o 409. Nenhuma lista de tabelas escrita à mão: uma FK nova entra na contagem sem mexer em código. O nome amigável de cada tabela ("campanhas", "perfis") vem de `rotulos-de-uso.constants.ts`; tabela sem rótulo aparece como "registro(s) em <tabela>". Detalhe técnico: toda requisição roda numa transação só (`GlobalDbInterceptor`), e depois de um comando que falha o Postgres recusa qualquer outro. Por isso o DELETE roda dentro de `comPontoDeRetorno` (`commons/database/ponto-de-retorno.util.ts`, um `SAVEPOINT`): se ele falhar, a transação volta só até ali e ainda aceita as contagens. Contar **antes** do DELETE não servia, porque quem não tem permissão receberia "em uso em 3 campanhas" em vez de 403. As contagens passam pela RLS; se nada for contado, volta o texto genérico em vez de "em uso em 0". Conferido na API: 409 com contagem, 404 e 403 inalterados.

📌 **As funções de moderação do `03` recusam com código próprio (27-09-2026).** Suspender/revogar conta, suspender/reativar pesquisador, desbloquear login, excluir conta, corrigir CPF, criar perfil ou campanha para outro, excluir campanha à força, suspender papel e alterar perfil de outro davam `RAISE EXCEPTION` sem ERRCODE (P0001). Por isso 10 serviços tinham um `catch` próprio que devolvia 403 em **qualquer** erro, até "motivo é obrigatório" (que é 400) ou uma falha de banco. Agora as recusas têm código (92012 a 92024 = sem permissão, 90020/90021 = dado inválido, `DOCUMENTACAO_ERRCODE.md`) e os `catch` saíram: o filtro global responde com a mensagem da própria função. Suíte 20 do PGlite. No Supabase: Grupo S.

📌 **`@UsuarioAtual()` (`commons/auth/usuario-atual.decorator.ts`).** Quem está logado, direto no parâmetro do controller, em vez de receber o `request` inteiro só para ler `request.user!.idUsuario` (o `!` era uma afirmação sem garantia). Se `request.user` faltar, responde 401. Usado em 15 controllers; ficam com o `request` inteiro os que precisam dele (login, cadastro e renovação leem IP e cabeçalhos) e as rotas de login opcional (perfil de pesquisador visto por visitante).

📌 **`POST /usuario` exige login e a permissão `usuario_criar` (28-09-2026, checada no controller porque o cadastro público reaproveita o mesmo service sem ninguém logado).** É o "Criar usuário" do painel; quem cria a própria conta usa o `POST /auth/cadastro`, que grava o aceite dos Termos de Uso. Antes, um anônimo criava conta por aqui pulando o aceite.

📌 **`temCodigoPostgres(erro, codigo)` (`commons/database/codigo-postgres.util.ts`).** "Este erro veio do Postgres com este SQLSTATE?" conferido de verdade, sem o `as { code?: string }` que se repetia em 9 lugares.

### 5.2 Quando tratar localmente em vez de deixar cair no filtro

O filtro nasceu como rede de segurança: `usuario.service.create` não tinha `try/catch` nenhum, e e-mail duplicado virava 500 cru em vez de 409. Hoje ele é o lugar de toda duplicidade (§5.1).

O service só trata localmente o que o filtro não tem como saber: o **contexto** de um 42501. `configuracoes.service.create.ts` é o exemplo:

```ts
if (codigo === '42501') throw new ForbiddenException(
  dto.global ? "Sem permissão 'configuracao_gerenciar' para criar configuração global."
             : 'Sem permissão para criar esta configuração.');
```

⚠️ **`try/catch` em volta de query continua sendo armadilha.** Ver §2.4 - tratar localmente **não** desfaz o aborto da transação. Os exemplos acima são seguros porque relançam sempre (o erro sobe, o interceptor faz `ROLLBACK`, a requisição termina); o perigo é *engolir* e seguir usando o mesmo `db`.

---

## 6. Validação e DTOs (`class-validator` + converters)

### 6.1 O `ValidationPipe` global

Em `main.ts`:

```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, exceptionFactory: excecaoDeValidacao })
```

- **`whitelist`** - descarta campo que não está no DTO.
- **`forbidNonWhitelisted`** - rejeita a requisição inteira se vier campo a mais, em vez de só ignorar. 📌 O comentário explica a escolha: ignorar em silêncio esconderia erro de digitação no corpo da requisição.
- **`transform`** - converte o corpo para instância real da classe do DTO (sem isso, os decorators não validam nada útil), e é o que faz `@Type(() => Number)` funcionar em query string.
- **`exceptionFactory`** - `commons/validacao/erro-de-validacao.ts`: o 400 continua com a lista de mensagens em `message` e ganha `campos` (`{ nome: ["..."] }`, campo aninhado como `endereco.cep`), para a tela marcar o campo certo.

📌 **Transformações de entrada centralizadas** (`commons/validacao/transformacoes.decorator.ts`), rodam antes da validação:
- `@TextoLimpo()` - tira espaço das pontas e junta espaços repetidos ("  Site   Pessoal " vira "Site Pessoal"); só-espaço vira vazio e cai no `@IsNotEmpty`. Não mexe em maiúscula/minúscula de propósito (ORCID, GitHub, frases de motivo). Aplicado em nome/descrição de tipo de link, área do conhecimento e motivo de denúncia (criar e alterar).
- `@BooleanoDaQuery()` - "true"/"false" da query string viram booleano (`@Type(() => Boolean)` transformaria "false" em `true`). Era uma função copiada igual em três DTOs de listagem.

📌 **Isso não existia no começo do projeto.** O comentário registra o achado: nenhum DTO tinha decorator de validação e não havia `ValidationPipe` nenhum - e-mail vazio e senha de 1 caractere passavam direto para o Postgres.

### 6.2 As três camadas de DTO

```
dto/request/    ← entrada, com decorators de class-validator
dto/response/   ← saída, interface pura (camelCase), sem decorator
dto/converter/  ← a tradução entre snake_case do banco e camelCase da API
```

**Request** - a regra que se repete em todos: **campo que o servidor decide nunca entra no DTO.** `campanha.request-create.ts` deixa isso explícito no comentário: `id_usuario` vem sempre de `request.user.idUsuario`; `status`, `aprovado_em`, `id_admin`, `taxa_plataforma` e `valor_bruto_arrecadado` são geridos por trigger ou por endpoints de ação dedicados (`aprovar`/`rejeitar`), nunca pelo `create` genérico.

Padrões de validação em uso: `@IsIn(CONSTANTE_DO_DB_TYPES)` para ENUMs; `@IsOptional()` para nullable; `@MaxLength` espelhando o limite técnico largo da constraint (ex.: 20.000 em `descricao`, o mesmo de `CK_CAMPANHA_DESCRICAO_TAMANHO`) - o limite de negócio configurável continua sendo trigger no banco; `@IsNumber({ maxDecimalPlaces: 2 })` para dinheiro; `@IsUrl()`, `@IsDateString()`, `@Matches()` onde couber.

📌 **Limite técnico no DTO, limite de negócio no banco.** O DTO repete o teto largo da constraint (feedback imediato, sem ida ao banco) e **não** repete o limite configurável (que muda por `UPDATE` numa linha de `configuracoes`, sem deploy). Mesmo raciocínio que o `DOCUMENTACAO_BD.md` já usa nas constraints.

**Response** - interface pura em camelCase. Nenhum decorator, nenhuma lógica.

**Converter** - classe com método estático `paraResponseDto(linha)`. Duas variações deliberadas:

- **`Pick<>` em vez da entity inteira** (`usuario.converter.ts`): os services nunca selecionam `senha_hash`, então exigir a entity completa quebraria a tipagem de toda query que usa `USUARIO_COLUNAS_SELECT`. O `Pick` aceita qualquer objeto que tenha *pelo menos* os campos usados.
- **Converter que recebe uma dependência** (`arquivo.converter.ts`): recebe `armazenamento` como parâmetro porque montar a URL pública exige saber `STORAGE_PUBLIC_BASE_URL`. Continua sem estado próprio - só delega a montagem para quem já tem a configuração carregada. É o único converter assim.

📌 **`CampanhaRequestCreate.modelo` aceita só `'all-or-nothing'`.** O V7 prevê os dois modelos, mas as regras do flexível (repasse independente da meta, aviso ao doador, encerramento) dependem do módulo de pagamento e do checkout; aceitar `'flexivel'` criaria uma campanha sem nenhuma dessas proteções. O valor continua no enum e no seed, e o DTO volta a aceitar os dois quando o módulo de pagamento existir.

### 6.3 Constante de colunas por módulo

Quase todo módulo tem `constants/<nome>.constants.ts` com a lista de colunas do `SELECT`:

```ts
export const USUARIO_COLUNAS_SELECT = ['id_usuario','nome','email', ...] as const;
```

📌 **Isso não é só evitar repetição - é uma trava de segurança.** `USUARIO_COLUNAS_SELECT` existe para que `senha_hash` **não possa** entrar numa resposta por acidente; o comentário no arquivo é explícito ("aqui é a lista PÚBLICA, sem `senha_hash` de propósito"). A única query que lê a coluna é o login, isolada, e nem passa pelo converter.

---

## 7. O padrão de módulo - anatomia de `1-usuario` e `12-campanha`

Este é o "modelo" a copiar ao construir um módulo novo. Os dois exemplos abaixo são propositalmente diferentes: `1-usuario` é o mais antigo e o mais cheio de casos especiais; `12-campanha` é mais recente e mais limpo.

### 7.1 A estrutura de pastas

```
<N>-<nome>/
├── <nome>.module.ts
├── constants/<nome>.constants.ts        ← colunas do SELECT, limites locais
├── controllers/<nome>.controller.<acao>.ts
├── service/<nome>.service.<acao>.ts
├── dto/request/<nome>.request-<acao>.ts
├── dto/response/<nome>.response[-<variante>].ts
├── dto/converter/<nome>.converter.ts
├── guards/<nome>.guard.<acao>.ts          ← só onde existe (1-usuario, 3-auth)
└── util/<nome>.util.<acao>.ts            ← só onde faz sentido (3-auth, 12-campanha, 25-arquivo)
```

📌 **Nome de arquivo: `entidade.camada.ação`, ação em inglês (28-09-2026).**
- **Em palavras simples:** o nome do arquivo diz de qual tabela ele cuida, qual o papel dele e o que ele faz, sempre na mesma ordem. Assim, só pelo nome já se sabe onde procurar. Ex.: `usuario.controller.export-data.ts` é a "porta de entrada" (controller) da ação "exportar dados" do usuário.
- **Decisão:** `<nome>` é a **tabela** que o arquivo trata, não o módulo (por isso `2-papel-permissao` tem arquivos `papel.`, `permissao.`, `papel-permissao.` e `usuario-papel.`). A ação é em inglês: o CRUD (`create`, `findall`, `findone`, `update`, `remove`) e o resto no mesmo idioma (`suspend`, `approve`, `reject`, `submit`, `export-data`, `create-for-other`...). Guardas e utilitários seguem a mesma ordem. 98 arquivos foram renomeados para isso, sem nenhuma rota mudar.
- **Motivo:** a mistura de português e inglês no nome (`create-para-outro`, `termo-uso.service.criar` ao lado de `usuario.service.create`) deixava o padrão imprevisível.
- **A classe segue o nome do arquivo (28-09-2026):** `usuario.service.suspend.ts` exporta `UsuarioServiceSuspend`; `auth.guard.jwt.ts`, `AuthGuardJwt`. 104 classes renomeadas, mais os 14 arquivos de `11-configuracoes`, que passaram para o plural da tabela (`configuracoes.*`, classes `Configuracoes...`).
- **Regra do idioma, em uma frase:** inglês para a **estrutura** (o papel do arquivo e a ação, no nome do arquivo e da classe); português para o **assunto** e todo o resto (`usuario`, `campanha`, métodos como `.suspender()` e `executar()`, variáveis, campos do JSON e os endereços da API, como `/usuario/:id/suspender`).
- **Caso-limite aceito:** os endereços da API e os campos do JSON ficam em português porque o React depende deles; mudar custaria reescrever as 119 rotas e o React sem ganho de funcionamento. Os tipos do React que espelham os DTOs usam os mesmos nomes das classes do Nest (ver `DOCUMENTACAO_FRONTEND.md`).

📌 **A regra mais visível do projeto: um arquivo por ação.** Não existe `UsuarioService` com 8 métodos - existem `UsuarioServiceCreate`, `UsuarioServiceUpdate`, `UsuarioServiceRemove`, `UsuarioServiceSuspend`, `UsuarioServiceUnlock`, `UsuarioServiceFindAllLogins`, `UsuarioServiceFindAll` e `UsuarioServiceFindOne`, cada um num arquivo, cada um com um único método público `executar()`. O mesmo vale para controllers.

📌 **O que isso compra.** Duas pessoas mexendo em ações diferentes do mesmo módulo nunca colidem no mesmo arquivo (relevante para um TCC em dupla). Cada arquivo carrega os comentários da *sua* regra, sem virar um arquivo de 600 linhas com contexto de oito assuntos misturados. E a lista de arquivos numa pasta já é a lista de capacidades do módulo.

📌 **O que isso custa.** Muito arquivo (94 controllers, 98 services) e um `@Module` com listas longas de `controllers`/`providers`. O custo é aceito conscientemente.

**Entity** é sempre um apelido, não uma classe escrita à mão, e mora no próprio `commons/database/db.types.ts`, junto da planta das tabelas:

```ts
export type UsuarioEntity = Selectable<UsuarioTable>;
```

📌 **Peças compartilhadas em `commons` em vez de repetidas por módulo (28-09-2026).**
- **Em palavras simples:** quando dois módulos precisavam de um "formulário" ou "resposta" exatamente igual, cada um tinha a sua cópia. Agora existe uma só, na pasta de peças compartilhadas (`commons`), e os dois usam a mesma.
- **Decisão:** os 11 arquivos `entity/<nome>.entity.ts` (uma linha cada) viraram 11 linhas no fim do `db.types.ts`, e as pastas `entity/` sumiram. `SuspensaoRequestDto` e `SuspensaoResponseDto` (`commons/moderacao/dto/`) servem à suspensão de conta e à de pesquisador. `PorCampanhaQueryDto` (`commons/database/dto/`) serve às listagens de atualizações e de comentários. A renovação de sessão devolve o mesmo `AuthResponseLogin` do login. Saíram 18 arquivos e entraram 3 em `commons`: 15 a menos.
- **Motivo:** eram cópias idênticas; mudar uma e esquecer a outra seria questão de tempo.
- **Caso-limite aceito:** a suspensão de um **papel** (arquivo `usuario-papel.request-suspend`, removido em 29-09-2026, ver "Correções da super auditoria") continuava separada, porque não pedia motivo. Se um dia uma das suspensões precisar de um campo que a outra não tem, ela volta a ter DTO próprio.

### 7.2 Anatomia de um controller

Controllers são **finos** - sem lógica, sem checagem:

```ts
@Controller('arquivo/upload')
export class ArquivoControllerStartUpload {
  constructor(private readonly service: ArquivoServiceStartUpload) {}

  @Post('iniciar')
  iniciar(@Body() dto: ArquivoRequestStartUpload, @UsuarioAtual() usuario: UsuarioAutenticado) {
    return this.service.executar(dto, usuario.idUsuario);
  }
}
```

Três coisas para notar:
- **O id de quem está logado vem do `@UsuarioAtual()` no controller e é passado como parâmetro** ao service. Nenhum service lê `request` - ele recebe o id. Isso mantém os services testáveis e livres de HTTP.
- **Não há guarda na rota porque o login é o padrão:** a `AuthGuardRequireAuth` global garante que `request.user` existe; só as rotas `@Publico()` aceitam anônimo.
- **`@Param('id', ParseIntPipe)`** - conversão e validação de id de rota, sempre.

📌 **Vários controllers com o mesmo `@Controller('usuario')`.** O Nest agrega as rotas normalmente. Há um comentário registrando o cuidado real que isso exige: `GET /usuario/:id/logins` não conflita com `GET /usuario/:id` porque o Nest casa rota por número de segmentos.

### 7.3 Anatomia de um service

```ts
@Injectable()
export class CampanhaServiceCreate {
  constructor(private readonly database: DatabaseService) {}

  async executar(dto: CampanhaRequestCreate, idUsuario: number): Promise<CampanhaResponse> {
    const linha = await this.database.getDb()
      .insertInto('campanha')
      .values({ id_usuario: idUsuario, /* ... */ })
      .returning(CAMPANHA_COLUNAS_SELECT)
      .executeTakeFirstOrThrow();
    return CampanhaConverter.paraResponseDto(linha);
  }
}
```

📌 **Repare no que NÃO está aqui.** Nenhuma validação de negócio: prazo (15-60 dias, configurável), meta mínima, limite de 2 campanhas simultâneas por pesquisador, e a exigência de `status_pesquisador = 'ativo'` são **todas** trigger ou RLS no banco. O comentário do arquivo é explícito sobre o porquê: o `PostgresExceptionFilter` já traduz os ERRCODEs com a mensagem original da função, e **duplicar aqui só arriscaria divergir com o tempo**.

📌 **Um detalhe de Kysely que vale saber:** `modelo` só entra no `INSERT` se vier no DTO (`...(dto.modelo ? { modelo: dto.modelo } : {})`), em vez do `?? null` usado nas colunas nullable. A coluna é `NOT NULL` com `DEFAULT` - mandar `null` explícito violaria a constraint; **omitir a chave** é o jeito de deixar o banco aplicar o próprio default.

### 7.4 Casos especiais que valem estudar

**`UsuarioServiceUpdate`** - o service mais denso do projeto, e o que mais ensina:

- **Um DTO, dois fluxos.** `senhaAtual` presente = troca autoatendida (exige `bcrypt.compare` antes); ausente = reset administrativo. O comportamento muda pela *forma* do DTO, sem endpoint separado.
- 🧩 **Ordem que importa por causa da RLS.** Ao trocar a foto de perfil, a foto antiga é desativada **antes** do `UPDATE` de `usuario`. O comentário explica: `pol_arquivo_update` só permite desativar um arquivo **enquanto o vínculo de posse existe** (`usuario.id_imagem_perfil` ainda aponta para ele). Depois que o `UPDATE` trocar o vínculo, ninguém sem `arquivo_gerenciar` conseguiria mais desativar a antiga - e o arquivo ficaria órfão para sempre.
- **`best-effort` com log, nunca em silêncio.** A limpeza da foto antiga é `.catch()` com `logger.warn` - uma falha ali não pode travar a atualização de nome/senha. O comentário registra o achado que motivou o log: arquivo órfão apareceu no bucket sem **nenhum** rastro do motivo. *Best-effort não é o mesmo que invisível.*
- **`UPDATE` sem coluna nenhuma é SQL inválido** - o service devolve 400 claro em vez de deixar o Postgres estourar erro de sintaxe.

**`ComentarioServiceUpdate`** - não calcula mais `ordem_endosso` (26-09-2026). Ao endossar, a trigger `validar_comentario_endosso_autor` calcula `MAX(ordem_endosso) + 1` da campanha sob `pg_advisory_xact_lock` (dois endossos ao mesmo tempo na mesma campanha ficam em fila e não repetem o número nem passam do limite), e ao remover o endosso zera a ordem; o service só manda `endossado`. Como o `UPDATE` que não afeta linha nenhuma pode ser "não existe" ou "a RLS barrou", o service usa `distinguir404ou403` (sem o `SELECT` prévio que existia só para achar a campanha). A trigger de limite (`validar_comentario_endosso`) confere `NEW.endossado`, para não depender de a ordem já estar calculada.

**`CampanhaServiceCloseExpired`** (05-09-2026, RF-057) - o único service do projeto que roda **fora** do pipeline HTTP, e por isso o único que não usa `DatabaseService.getDb()`:

> Achado numa revisão de sistema completa: `encerrar_campanhas_vencidas()` (Postgres, `[05-K-2]`) sempre existiu e sempre esteve correta, mas nada nunca a chamava - nenhum `@nestjs/schedule` instalado, nenhum `@Cron`, nenhum `pg_cron`. Na prática, uma campanha vencida continuava `'ativo'` para sempre.

- **`@Cron('*/15 * * * *')`** (`@nestjs/schedule`, registrado uma vez em `AppModule` via `ScheduleModule.forRoot()`) chama `SELECT public.encerrar_campanhas_vencidas()` a cada 15 minutos.
- **Não precisa de `app.id_usuario_atual` setado** porque a função é `SECURITY DEFINER` - o mesmo motivo por trás dela existir: bypassa a RLS por desenho (dono da função, não a sessão de quem chama), então não importa que o job não tenha "usuário logado" nenhum. Mesma categoria de `registrar_falha_login`/`registrar_login_sucesso` (`[03-O]`), que também rodam sem sessão.
- **`@Cron` sozinho não faz nada** sem `ScheduleModule.forRoot()` registrado uma vez em algum módulo raiz (`AppModule`, neste projeto) - é o agendador de verdade rodando por trás; o decorator só registra o handler nele.

#### 🧩 Por que injeta `PG_POOL` direto, e não `DatabaseService.getDb()` - explicado do zero

**O que é um "Pool" de conexão, em termos simples.** Abrir uma conexão nova com o banco de dados (o "aperto de mão" inicial entre o Nest e o Postgres) é uma operação relativamente cara - leva um tempinho perceptível, ainda mais num banco na nuvem (Supabase). Se o app abrisse uma conexão nova pra cada consulta e fechasse na hora, ia gastar a maior parte do tempo só "cumprimentando" o banco, não fazendo trabalho de verdade. Um **Pool** resolve isso: é um conjunto de conexões já abertas e prontas, mantidas vivas o tempo todo, que o código **empresta** quando precisa e **devolve** quando termina - como uma fila de guichês já abertos num banco físico, em vez de abrir e fechar guichê a cada cliente nesse mesmo prédio. `PG_POOL` é o nome (token) que este projeto usa pra esse conjunto de conexões - ele já existe desde o primeiríssimo dia do projeto (`DatabaseModule`, seção 2), é o mesmo Pool que sustenta **toda** conversa com o banco, em qualquer rota HTTP.

**Por que o caminho normal (`DatabaseService.getDb()`) não serve aqui.** Em toda rota HTTP normal deste projeto, existe uma etapa que roda **antes** de qualquer service: o `GlobalDbInterceptor` (seção 2.2) pega **uma** conexão emprestada do Pool, abre uma transação nela, avisa ao Postgres "quem está perguntando" (`SET LOCAL app.id_usuario_atual = ...`, é isso que faz a RLS/segurança por linha funcionar) e guarda essa conexão específica num lugar que qualquer service da mesma requisição consegue achar depois (`nestjs-cls`, explicado na seção 15.3) - é esse "achar depois" que `DatabaseService.getDb()` faz. **O problema: um `@Cron` não é uma rota HTTP.** Ninguém visitou nenhuma URL pra disparar isso - o relógio do `@nestjs/schedule` só chama a função do service diretamente, o `GlobalDbInterceptor` **nunca roda**, e por isso nunca existe nenhuma conexão guardada pra `DatabaseService.getDb()` achar. Se eu tivesse tentado usar ele aqui mesmo assim, o próprio código já previa esse erro exato (`database.service.ts`): *"chamado fora de uma requisição com GlobalDbInterceptor já executado - nenhum Kysely disponível no contexto"* - o app teria simplesmente quebrado a cada 15 minutos.

**O que eu fiz em vez disso:** peguei emprestado o **mesmo Pool de sempre** (`PG_POOL`, já existente, `@Inject(PG_POOL)`), mas usei ele **diretamente** - sem passar pela etapa de "abrir transação e avisar quem está perguntando", porque para esta chamada específica isso não faz falta nenhuma: a função `encerrar_campanhas_vencidas()` é `SECURITY DEFINER`, o que (explicado na seção 4 e no `DOCUMENTACAO_BD.md`) significa que ela roda sempre com a MESMA autoridade fixa, não importa quem a chamou - não precisa saber "quem está perguntando" porque a resposta é sempre a mesma. É o equivalente a uma máquina de café que funciona do mesmo jeito não importa qual funcionário aperte o botão, então não precisa nem crachá nem identificação pra usar.

#### É a melhor solução? É *future-proof*?

**Para o tamanho e a fase atual do projeto: sim, é a solução certa** - simples, usa infraestrutura que já existe (nenhuma peça nova além do agendador em si), e é literalmente o padrão recomendado no ecossistema NestJS para "preciso rodar algo periodicamente, sem que seja uma rota HTTP visitada por alguém" - qualquer outro job futuro deste tipo (ex.: expirar QR Code do RF-076, reprocessar notificação com falha) pode copiar exatamente este molde: injetar `PG_POOL`, um método com `@Cron`, pronto.

**Uma limitação real, que vale você saber para explicar se perguntarem:** isto roda **dentro do mesmo processo** do servidor Nest - ou seja, só dispara enquanto o backend estiver de pé. Hospedagem gratuita (Render, citado em `PENDENCIAS e correcoes.md`/RNF-012) costuma **"dormir"** um serviço web depois de um tempo sem nenhuma requisição chegando, acordando de novo só quando alguém acessa. Se isso acontecer, o `@Cron` também dorme junto - nenhuma campanha vence "atrasado de verdade" nesse intervalo, só fica pendente de encerrar até o backend acordar por qualquer motivo (a próxima visita de qualquer usuário já é suficiente). Quando acorda, a própria natureza da função resolve isso sozinha, sem precisar de nada especial: ela sempre confere `data_fim <= NOW()` contra o relógio de agora, então uma campanha vencida há 2 horas ou há 2 minutos é encerrada do mesmo jeito na primeira checagem depois de acordar - nada fica "perdido pra sempre", só potencialmente **atrasado** enquanto o servidor está dormindo. Este é o mesmo tipo de limitação que o projeto já aceita conscientemente em outros lugares por causa da hospedagem gratuita (RNF-012: "disponibilidade mínima de 95%... limitações de uptime são reconhecidas como restrição do ambiente acadêmico") - não é uma falha de desenho, é uma característica do ambiente gratuito.

**A alternativa mais robusta, se um dia isso importar de verdade:** a extensão `pg_cron` do próprio Postgres (o Supabase oferece ela pronta pra ativar) - ela agenda a chamada **dentro do banco**, independente de o backend Nest estar dormindo ou não. Não implementei isso agora porque adiciona uma peça de infraestrutura nova (mexer em configuração do Supabase, não só código do projeto) pra resolver um problema que, na prática, hoje é pequeno: ninguém está cronometrando o segundo exato em que uma campanha de TCC deveria fechar. Fica anotado aqui como o caminho natural de evolução, não como algo faltando.

#### Isso vai causar lag ou sobrecarregar o banco?

**Não, e dá pra explicar exatamente por quê, sem "confiar" apenas.** A chamada roda a cada 15 minutos (96 vezes por dia) e faz, por trás, um `UPDATE campanha SET status = ... WHERE status = 'ativo' AND data_fim <= NOW()`. Dois fatores garantem que isso é barato:

1. **Existe um índice feito sob medida pra essa consulta exata:** `idx_campanha_status_data_fim`, em `(status, data_fim)` (`02_indices.sql`). Em vez de o Postgres precisar olhar linha por linha de **toda** a tabela `campanha` pra achar quem está vencido, ele usa esse índice pra pular direto pras linhas com `status = 'ativo'` já ordenadas por `data_fim` - o mesmo princípio de um índice remissivo no fim de um livro em vez de ler a obra inteira procurando uma palavra. Rápido mesmo com a tabela crescendo.
2. **Na prática, a maioria das checagens não muda nenhuma linha.** Entre uma checagem e outra (15 minutos), é raro existir alguma campanha cujo prazo tenha vencido bem naquela janela - então o `UPDATE` na maior parte das vezes afeta **zero linhas**, e um `UPDATE` que não muda nada é praticamente instantâneo. Ele só trava (bloqueia) as linhas que efetivamente atualiza, nunca a tabela inteira - outras consultas acontecendo ao mesmo tempo (alguém navegando, doando, etc.) não sentem nada disso.

Pra comparação de escala: 96 chamadas por dia é um volume desprezível perto do tráfego normal de qualquer aplicação com usuário de verdade - não chega perto de nenhum limite de uso do plano gratuito do Supabase (que é sobre espaço em disco e certas cotas de API, não sobre "número de consultas simples" como esta). Resumindo: nem o intervalo de 15 minutos, nem a query em si, representam risco de lentidão pro sistema.

**Os 6 jobs agendados do sistema.** Todos seguem o molde acima (`PG_POOL` direto, função `SECURITY DEFINER`, `@Cron`):

| Job | Cron | Função SQL | O que faz |
|---|---|---|---|
| `CampanhaServiceCloseExpired` | a cada 15 min | `encerrar_campanhas_vencidas()` | campanha `ativo` com prazo vencido vira `sucesso` ou `nao_atingido` |
| `PerfilPesquisadorServiceReactivateExpired` | a cada 15 min | `reativar_pesquisadores_vencidos()` | a suspensão do poder de pesquisador expira sozinha |
| `CampanhaServiceExpireDrafts` | de hora em hora | `expirar_campanhas_rascunho()` | apaga rascunho mais velho que `campanha_rascunho_ttl_horas` (336h), contado da criação |
| `CampanhaServiceExpireRejected` | de hora em hora | `expirar_campanhas_rejeitadas()` | apaga campanha rejeitada cujo prazo de reenvio (`campanha_rejeitada_prazo_dias`, 30) venceu |
| `ArquivoServiceCleanOrphans` | 1x por dia, às 4h | `desativar_arquivos_orfaos()` | desativa arquivo que ninguém adotou (nem foto nem anexo) em `arquivo_horas_para_vincular` (24h; 0 = desligado), apaga o objeto do armazenamento e deixa uma linha de rastro |
| `LogAuditoriaServiceClean` | 1x por dia, às 3h | `limpar_log_auditoria()` | apaga `log_auditoria` mais velho que `log_auditoria_retencao_dias` (365; 0 = guardar para sempre) e deixa uma linha de rastro com a quantidade e a data de corte |

Os 6 têm `try/catch` com `logger.error` (incluindo o nome do job). Motivo: o `@Cron` chama o método sem `await` de ninguém, então uma exceção da função SQL vira `unhandledRejection`, e o Node moderno derruba o processo inteiro por causa de um job de limpeza. Só o registro da falha, sem repetir a tentativa: o job roda de novo no próximo ciclo.

**Ciclo de vida da campanha no Nest** (ver `DOCUMENTACAO_BD.md`, [05-K-2-B], para as regras; o Nest só expõe os endpoints e deixa o banco decidir):
- `POST /campanha/:id/enviar` (`CampanhaServiceSubmit`): `rascunho -> aguardando_aprovacao` e o reenvio `rejeitado -> aguardando_aprovacao`, no mesmo endpoint. Não repete nenhuma validação: completude, prazo, reenvios, suspensão e limite de simultâneas saem do banco com ERRCODE próprio (90009 a 90011, 90015, 91025, 91026, 92009, 91018).
- `POST /campanha/:id/deslizar-datas` (`CampanhaServiceShiftDates`, corpo `{ novaDataInicio }`): chama `deslizar_datas_campanha()`, que move início, fim e marcos do cronograma mantendo a duração.
- `GET /campanha/:id` (`CampanhaServiceFindOne`) também devolve `camposBloqueados` (26-09-2026): a lista, com os nomes do DTO, que `fn_campanha_campos_bloqueados` (`[05-K-2-D]`) diz estar travada naquele momento, a mesma que a trigger de congelamento usa. O React trava exatamente esses campos, sem lista própria. Vem vazia nas outras respostas (listagem inclusive). Preenche também `reenviosRestantes`, `prazoReenvioAte` e `somenteLeitura` só para campanha `rejeitado`, para a tela e o futuro e-mail de rejeição. Não refaz a conta em TypeScript: faz um único `SELECT * FROM public.fn_campanha_situacao_reenvio(id)`, a mesma função que a trigger de transição e o job de expirar rejeitadas usam (`DOCUMENTACAO_BD.md`, `[05-K-2-B]`). Por ser `SECURITY DEFINER`, os números saem exatos para quem já enxerga a campanha, mesmo sem acesso à tabela de histórico.
- `DELETE /campanha/:id` só funciona em `rascunho` (a RLS decide).
- **Aprovar e rejeitar só valem para campanha "aguardando aprovação" (28-09-2026).**
  - **Em palavras simples:** antes, o admin conseguia rejeitar de novo uma campanha já rejeitada, o que gastava um reenvio do pesquisador à toa, e rejeitar sem escrever o motivo. Agora a API responde "não dá" nesses casos, com a razão.
  - **Decisão:** `CampanhaServiceApprove` e `CampanhaServiceReject` filtram o UPDATE por `status = 'aguardando_aprovacao'`; se não acham a linha, `exigirAguardandoAprovacao()` (`12-campanha/util/campanha.util.require-pending.ts`) responde 409 com o status atual, antes do 404/403 de sempre. A justificativa da rejeição é obrigatória (`CampanhaRequestReject`, pelo menos 3 caracteres), como manda o RF de aprovar/rejeitar campanha.
  - **Motivo:** `trg_campanha_valida_transicao` (05) libera qualquer transição para quem tem `campanha_aprovar`/`campanha_rejeitar`, então o banco não barrava a repetição. Achado na revisão de 28-09-2026, testando pela API.
  - **Caso-limite aceito:** a trava está no Nest, não na trigger; quem escrever direto no banco com essas permissões ainda consegue repetir. Mexer na trigger crítica de transição só por isso não compensou.
- `GET /historico-rejeicao?idCampanha=` devolve também `idUsuarioDono` e `tituloCampanha`, e continua funcionando para campanha já excluída (o histórico não tem FK para `campanha`).
- `GET /usuario/eu/exportar-dados` inclui `historicoRejeicoes` das campanhas do titular, sem `id_admin` (quem rejeitou é dado do administrador).

**Nome e sinal de score em listar e consultar campanha.** `GET /campanha` e `GET /campanha/:id` usam `selecionarCampanhaComNomes()` (`12-campanha/util/campanha.util.with-names.ts`): as colunas da campanha mais `nomePesquisador` e `nomeArea` (`LEFT JOIN` com `usuario` e `area_conhecimento`, porque a RLS pode esconder o usuário e a campanha continua aparecendo, só sem o nome) e `precisaRevisaoScore`. O front não precisa baixar o catálogo de usuários e de áreas para resolver dois nomes. `precisaRevisaoScore` é `fn_precisa_revisao_score` só para campanha `aguardando_aprovacao` **e** para quem tem `campanha_aprovar`; nos outros casos é `null` (o dono não fica sabendo do sinal). As outras respostas (criar, editar, aprovar...) devolvem os três campos como `null`.

**`CampanhaServiceFindAll`** - filtros que **não** são autorização:
> *"`pol_campanha_select` já decide QUAIS linhas aparecem (status público, ou dono, ou `relatorio_visualizar`) - os filtros abaixo são só conveniência de navegação por cima do que a RLS já deixou visível, nunca uma segunda camada de autorização."*

Também registra uma mudança concreta: era `orderBy('criado_em','desc')`, virou `orderBy('id_campanha')` a pedido do Lucas, porque `criado_em` do seed nem sempre bate com a ordem de inserção real (algumas linhas foram seedadas com timestamp retroativo).

**`UsuarioServiceExportData`** (05-09-2026, RF-016, exportação de dados (LGPD Art. 18), LGPD Art. 18, formalizado como **RF-016** nos Requisitos Funcionais, atualizados em 06-09-2026 - o requisito nasceu como "RF-015A" e foi promovido a RF-016 de verdade, empurrando +1 todo requisito daquele ponto em diante) - o endpoint mais sensível do sistema, e o que mais junta decisão de segurança num lugar só:

- **`GET /usuario/eu/exportar-dados`, sem `:id`, de propósito.** Todo outro endpoint deste módulo aceita um id de rota (`GET /usuario/:id`, etc.); este não - o ator é sempre `request.user!.idUsuario` (quem está autenticado), nunca um parâmetro. Decisão de uma IA, confirmada em conversa: aceitar um id aqui abriria a porta pro erro clássico de trocar o número e baixar dado de outra conta (a RLS provavelmente barraria, mas a boa prática é nem deixar o parâmetro existir num endereço deste tamanho de sensibilidade). Sem colisão de rota com `GET /usuario/:id` - `:id` do Express só casa um segmento, `eu/exportar-dados` tem dois.
- **Três proteções, nenhuma opcional:**
  1. **Rate limit de 1x/hora POR CONTA, não por IP.** O `ThrottlerGuard` padrão do projeto (usado em `/auth/login`) rastreia por IP - errado aqui, porque o objetivo não é proteger o servidor de tráfego, é impedir que uma conta comprometida seja raspada repetidamente (um IP compartilhado - escritório, faculdade - não pode travar todo mundo por causa da exportação de uma pessoa só). `UsuarioGuardExportDataThrottler` (novo, `guards/`) sobrescreve `getTracker()` pra usar `req.user.idUsuario` - só funciona porque `AuthGuardRequireAuth` roda antes dele no mesmo `@UseGuards()` (a ordem do array é a ordem de execução), garantindo que `req.user` já existe. `ThrottlerModule.forRoot([{ ttl: 3_600_000, limit: 1 }])` precisou ser registrado de novo dentro de `UsuarioModule` (`AuthModule` já registra o dele, mas `1-usuario` não importa `3-auth`) - duas instâncias independentes, cada uma só visível no módulo que a registrou, protegendo rotas diferentes com limites diferentes.
  2. **Rastro em `log_auditoria` a cada chamada**, via `registrar_exportacao_dados()` (`SECURITY DEFINER`, `DOCUMENTACAO_BD.md` `[03-O]`) - não um `.insertInto()` direto, porque `app_nestjs` só tem `GRANT SELECT` em `log_auditoria` (mesma restrição de sempre; só a trigger normalmente escreve lá).
  3. **`@Header('Cache-Control', 'no-store')`** - o tipo de conteúdo que não pode ficar guardado em proxy, CDN ou navegador.
- **CPF mascarado, nunca em texto puro.** O serviço reaproveita `decifrarCpf()` (o mesmo helper reversível usado em outros lugares do sistema) só pra mascarar em seguida (3 primeiros + 2 últimos dígitos) - decisão que passou por uma reversão em conversa com apoio de IA: a 1ª recomendação era exigir reautenticação por senha antes de exportar o CPF em texto puro, mas nenhum mecanismo de reautenticação existe em nenhum outro lugar do sistema (a exclusão de conta usa confirmação por e-mail digitado, não senha) - construir isso do zero só pra este caso de uso não se pagava, e mascarar preserva a mesma propriedade que o projeto já mantém em todo outro caminho HTTP: o CPF nunca sai do banco em texto puro.
- **O que fica de fora, e por quê:** denúncias feitas CONTRA o usuário, comentários de outras pessoas nas campanhas dele, e qualquer log de auditoria administrativo - são dados de TERCEIROS ou de moderação, não "dados pessoais do titular" no sentido do Art. 18. Contribuição **anônima** também não entra (nunca é ligada a nenhuma conta no banco, não existe "minha contribuição anônima" pra exportar).
- **Duas tabelas sem módulo Nest ainda (`seguir_pesquisador`, `contribuicao`) precisaram de tipos novos em `db.types.ts`** só pra esta query - nenhuma das duas tinha entrada na interface `DB` porque nenhum CRUD completo foi construído pra elas ainda; a exportação só precisa de `SELECT`, então ganhou os tipos sem precisar do módulo inteiro.

### 7.5 Exportação entre módulos

Módulos exportam services quando outro precisa reaproveitar a regra em vez de duplicá-la. Os casos reais:

| Módulo | Exporta | Para quem, e por quê |
|---|---|---|
| `1-usuario` | `UsuarioServiceFindOne` | `3-auth` devolve o usuário público no corpo do login sem duplicar query/converter |
| `1-usuario` | `UsuarioServiceCreate` | `POST /auth/cadastro` reaproveita a mesma criação de `POST /usuario` (hash + INSERT + `atribuir_papel_padrao()`) |
| `25-arquivo` | `ArquivoServiceRemove` | `UsuarioServiceUpdate` limpa a foto anterior na troca |
| `25-arquivo` | `ArquivoServiceResolveAvatar` | resolve a URL do avatar com o mesmo fallback em qualquer lugar |
| `5-termo-uso` | `TermoUsoServiceFindActive` | o cadastro grava o aceite do termo **ativo**, resolvido pelo servidor |

📌 **Ciclo de importação é evitado com direção única.** `1-usuario` importa `25-arquivo`; `25-arquivo` não importa `1-usuario` de volta (o comentário no `usuario.module.ts` diz isso explicitamente). `DatabaseModule` e `StorageModule` são `@Global()` - ninguém precisa importá-los, o que corta a maior fonte de ciclos.

---

## 8. Armazenamento e upload de arquivo (`commons/storage` + `25-arquivo`)

> ⚠️ **Este módulo foi alterado em 01-09-2026** (processamento com `sharp`, cota por usuário, novos tetos de tamanho). O que segue descreve o estado **atual**. Vários números aqui são recentes; confira as constantes no código antes de citá-los em outro lugar.

### 8.1 A premissa que simplifica tudo: nenhum arquivo é secreto

Foto de perfil, imagem de campanha, anexo de atualização - tudo é conteúdo público, feito para aparecer numa página que qualquer visitante anônimo abre. **Não existe no sistema um único arquivo que precise de controle de acesso na hora do download** (o dado realmente sensível, o CPF, é coluna de banco, não arquivo).

📌 **Consequência.** O bucket pode ser público e servido por um domínio próprio; o navegador busca a imagem direto de lá, sem passar pelo Nest e sem link assinado por leitura. `arquivo.chave` guarda o caminho do objeto, e `montarUrlPublica()` monta o endereço - string pura, zero rede. Metade da complexidade de um módulo de upload costuma ser controle de acesso ao download; aqui ela não existe. (Raciocínio completo em `ARQUIVO - Dica de Arquitetura.md`, o "doc de arquitetura" citado nos comentários do código.)

⚠️ **`ARQUIVO - Dica de Arquitetura.md` (hoje em `informacoes/arquivo morto/`) fala em Cloudflare R2** - ele foi escrito quando o R2 era o provedor cogitado. O **provedor atual é o Supabase Storage** (ver 8.2). O desenho descrito lá continua valendo integralmente; só o nome do provedor mudou.

### 8.2 A abstração: `ArmazenamentoService`

```
commons/storage/
├── storage.service.interface.ts       ← o contrato (ArmazenamentoService)
├── s3-compativel-armazenamento.service.ts  ← a implementação única
├── storage.constants.ts               ← token de injeção + pastas + expiração
└── storage.module.ts                  ← @Global(), registra o binding
```

Todo consumidor injeta `@Inject(ARMAZENAMENTO_SERVICE)` **contra a interface**, nunca contra a classe concreta - mesmo padrão de `PG_POOL`. **Nenhum arquivo fora de `commons/storage` importa `@aws-sdk/*` nem sabe o nome do bucket.**

Métodos do contrato: `gerarUploadPreAssinado`, `obterInfoObjeto`, `lerPrimeirosBytes`, `lerObjetoCompleto`, `enviarObjeto`, `moverObjeto`, `excluirObjeto`, `montarUrlPublica`.

**Provedor atual: Supabase Storage** (bucket S3-compatível, no mesmo projeto Supabase que hospeda o Postgres). Confirmado em três lugares: `nest/.env` (`STORAGE_ENDPOINT` aponta para `…storage.supabase.co/storage/v1/s3`), `nest/.env.example` (instruções de criação do bucket no painel do Supabase) e o comentário no topo do service.

📌 **Uma implementação cobre todos os provedores viáveis.** Supabase Storage, Cloudflare R2, Backblaze B2, AWS S3 e MinIO falam o **mesmo protocolo** (S3). Trocar de provedor é trocar variáveis de ambiente - `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`, `STORAGE_PUBLIC_BASE_URL`, `STORAGE_REGION`, `STORAGE_FORCE_PATH_STYLE` - **sem tocar em uma linha de TypeScript**. Só um provedor com API genuinamente não-S3 exigiria uma classe nova; nesse caso, muda-se o `useExisting` no `storage.module.ts` e nada em `25-arquivo` muda.

📌 **O comentário do código registra a correção de si mesmo:** *"CORRIGIDO 01-09-2026: este comentário dizia 'Backblaze B2 (provedor atual)' - estava desatualizado, o `.env` real nunca apontou pra B2 nesta fase do projeto."* Também registra a avaliação do R2 feita na mesma data (free tier maior) e a decisão de **ficar no Supabase por enquanto**, já que está funcionando.

📌 **`region: 'auto'` como padrão** - B2 e R2 não têm região de verdade, mas a lib exige o campo; `STORAGE_REGION` continua configurável para quem apontar para AWS S3 real. **`forcePathStyle: true` como padrão** (`endpoint/bucket/chave`) - funciona sem configuração extra na maioria dos endpoints.

🧩 **O client é construído sob demanda, não no constructor** - e o comentário explica que isso corrige um bug real. `StorageModule` é `@Global()` e registrado no `AppModule`, então o Nest instancia o provider **no boot**, antes de qualquer rota de arquivo ser chamada. Lançar erro no constructor por falta das `STORAGE_*` derrubava o processo Nest **inteiro** - login e todas as outras rotas paravam junto. Com validação preguiçosa, o erro só estoura quando alguém de fato usa upload, e o resto do sistema continua de pé.

### 8.3 O fluxo de upload, em 2 passos

```
NAVEGADOR                       NEST                            BUCKET
    │                            │                                │
    │─ POST /arquivo/upload/iniciar ─────────────>│                │
    │   { nomeOriginal, tipoMime, tamanhoBytes }  │                │
    │                            │ valida tipo/tamanho/cota        │
    │                            │ gera chave = pendente/<uuid>.ext│
    │<── { chave, urlUpload, cabecalhosObrigatorios, expiraEm } ───│
    │                            │                                │
    │──────────── PUT direto na URL pré-assinada ──────────────────>│
    │                            │                          pendente/<uuid>
    │                            │                                │
    │─ POST /arquivo/upload/confirmar ───────────>│                │
    │   { chave, nomeOriginal, tipoMime, tamanhoBytes, contexto }  │
    │                            │ HEAD ─────────────────────────>│
    │                            │ lê 16 bytes (magic number) ───>│
    │                            │ sharp: resize + WebP + sem EXIF │
    │                            │ checa cota com tamanho FINAL    │
    │                            │ grava em publico/ ────────────>│
    │                            │ INSERT em `arquivo`             │
    │<── ArquivoResponse { idArquivo, url, ... } ──────────────────│
```

📌 **Por que o navegador sobe direto para o bucket, e não via Nest.** O motivo declarado não é performance - é que o Nest roda em plano gratuito (que dorme e tem pouca memória), e um upload de vários MB atravessando esse processo é exatamente o tipo de coisa que trava o servidor numa demonstração de banca. Mandar o binário direto tira o risco do elo mais fraco da infraestrutura.

📌 **A regra que faz o desenho ser seguro:** *quem escolhe o nome e as regras da URL é o Nest, nunca o navegador.* A chave é sempre `pendente/<randomUUID>.<ext>`, gerada no service; `nomeOriginal` só serve para `arquivo.nome_original` e para o `Content-Disposition` de PDF. Se o front pudesse mandar o nome ou o tamanho máximo, **a validação toda vira decoração**.

📌 **`ContentLength` é assinado junto com a URL** - vira um `Content-Length` exigido no `PUT`. Não dá para "prometer" 800 KB e subir 50 MB: o provedor recusa antes de gravar um byte. Essa é a **primeira** camada de proteção de tamanho, antes de o arquivo existir.

📌 **`pendente/` → `publico/`, e órfãos resolvidos sem código.** Upload cai em `pendente/`; só depois de validado vai para `publico/`. Uma **regra de ciclo de vida configurada no painel do provedor** (não em código) apaga sozinha qualquer coisa em `pendente/` com mais de 24h. Isso substitui um job de limpeza inteiro - e é estritamente melhor, porque um job dependeria de o Nest estar de pé, e o dele dorme.

📌 **URL pré-assinada expira em 300s** (`SEGUNDOS_EXPIRACAO_UPLOAD`) - curto o bastante para limitar a janela de abuso, longo o bastante para uma conexão lenta subir alguns MB.

### 8.4 Validação de conteúdo: o navegador mente

`25-arquivo/util/arquivo.util.signature.ts`.

📌 **O `Content-Type` que o navegador declara é uma afirmação, não um fato.** Renomear `virus.exe` para `foto.jpg` faz o navegador dizer "é JPEG". A única forma confiável de saber o que subiu é ler os primeiros bytes do objeto **já no bucket** e conferir a assinatura (*magic number*) do formato:

| Tipo | Assinatura conferida |
|---|---|
| `image/jpeg` | `FF D8 FF` |
| `image/png` | `89 50 4E 47 0D 0A 1A 0A` (8 bytes) |
| `image/webp` | contêiner RIFF: `"RIFF"` nos bytes 0-3 e `"WEBP"` nos bytes 8-11 |
| `application/pdf` | `"%PDF-"` |

`QUANTIDADE_BYTES_ASSINATURA = 16` - suficiente para todos os quatro (o maior precisa de 12). A leitura é um **Range GET** (`lerPrimeirosBytes`), não o download do arquivo inteiro.

📌 **Falhou a assinatura → o objeto é apagado na hora**, sem esperar a regra de ciclo de vida de 24h varrer `pendente/`. E o erro é explícito para o usuário: *"O conteúdo do arquivo não corresponde ao tipo declarado (ex.: um executável renomeado para .jpg)."*

📌 **Por que aqui o precedente "o banco valida, o Nest não duplica" não se aplica.** O banco não enxerga o arquivo - ele só recebe o que o Nest afirma. Um `CHECK` em `tipo_mime` valida o **rótulo**; o **conteúdo** só a aplicação valida.

📌 **SVG nunca entra na allowlist, de propósito** - um SVG pode conter `<script>` embutido, e aceitá-lo num site com login abre um vetor de roubo de sessão para qualquer visitante que abra o arquivo. A mensagem de erro do DTO diz isso na cara.

📌 **PDF ganha `Content-Disposition: attachment` já no upload** (gravado como metadado do objeto, servido depois pelo bucket sem lógica extra na leitura) - força o navegador a baixar em vez de renderizar o PDF na aba/domínio do bucket. O nome original é sanitizado antes (`replace(/["\r\n]/g,'')`), porque aspas ou quebra de linha num `Content-Disposition` podem injetar cabeçalhos extras.

### 8.5 Processamento de imagem com `sharp`

`25-arquivo/util/arquivo.util.image-processing.ts`. Roda em `confirmar-upload`, **depois** de a assinatura já ter sido conferida - nunca processar bytes que ainda não foram validados como o tipo que afirmam ser.

Três operações, sempre nesta ordem:

```ts
sharp(bytesOriginais)
  .rotate()                                        // 1
  .resize({ width: perfil.larguraMaxima, withoutEnlargement: true })  // 2
  .webp({ quality: perfil.qualidadeWebp })         // 3
  .toBuffer();
```

1. **`.rotate()` sem argumento - auto-orienta pela EXIF, antes de tudo.** 🧩 A ordem é crítica: foto de celular em retrato quase sempre grava os pixels "deitados" e conta com o leitor aplicar a orientação da EXIF na hora de exibir. Descartar a EXIF (passo 3) **sem antes gravar a rotação nos pixels de verdade** faria a foto sair de lado para sempre.
2. **`.resize()` para o teto do contexto**, com `withoutEnlargement` - nunca **esticar** uma imagem menor que o teto (uma imagem de 300px não deve virar 512px borrado).
3. **`.webp({ quality })`** - 25-35% menor que JPEG na mesma qualidade visual. E, como o `sharp` não preserva metadado a menos que `.withMetadata()` seja chamado explicitamente, **a EXIF (localização GPS, modelo do aparelho) sai removida como efeito colateral gratuito**.

**Perfis por contexto** (`PERFIL_PROCESSAMENTO_POR_CONTEXTO`, em `arquivo.constants.ts`):

| Contexto | Largura máxima | Qualidade WebP |
|---|---|---|
| `avatar` | 512 px | 80 |
| `campanha` | 1600 px | 78 |
| `atualizacao` | 1600 px | 78 |

📌 **De onde vêm os números.** Nenhuma tela mostra avatar maior que ~96-128px de verdade (512px já é folga generosa para tela retina), enquanto uma capa de campanha em destaque pode ocupar a largura inteira de um monitor comum. Qualidade 78-80 é visualmente quase indistinguível do original para exibição em tela.

📌 **`CONTEXTOS_ARQUIVO` é lista fechada**, mesmo espírito de `TIPOS_MIME_PERMITIDOS`: um contexto novo exige decisão de produto (*qual teto?*), nunca um valor arbitrário vindo do cliente.

📌 **Mentir no `contexto` não é risco de segurança** - e o DTO diz isso explicitamente. Diferente de tipo/tamanho, o contexto não é conferido contra nada físico do arquivo; ele só escolhe o teto de redimensionamento. Mentir ali só faz a imagem sair maior ou menor do que o ideal para o próprio uso de quem mentiu.

📌 **PDF nunca passa pelo `sharp`.** `TIPOS_IMAGEM` (em `confirmar-upload`) lista só os três formatos de imagem; PDF vai direto de `pendente/` para `publico/` via `moverObjeto` (copy + delete - S3 não tem rename nativo), com bytes intactos.

📌 **Imagem não usa `moverObjeto`.** Como os bytes mudaram, o fluxo é `enviarObjeto(chaveDestino, bufferProcessado, 'image/webp')` + `excluirObjeto(chaveOriginal)`. A chave de destino troca só a extensão para `.webp` (seguro porque o nome base é sempre um `randomUUID`, sem ponto no meio), e o `tipo_mime` gravado no banco é `image/webp`, não o tipo original.

### 8.6 Tetos de tamanho, cota e rate limit - todos configuráveis pelo Painel Admin

📌 **Desde 04-09-2026, nenhum destes números é mais fixo no código.** Pedido do Lucas: *"arquivo não é configurável pelo Painel Admin... o administrador deve poder estabelecer o limite mínimo e máximo do tamanho dos arquivos de upload... a quantidade upload por usuário, e o tempo de respiro entre um upload e outro"* - o mesmo princípio já aplicado a `prazo_campanha_dias`, `limite_denuncias_24h` etc.: nada de regra de negócio hardcoded quando pode morar em `configuracoes` e ser editado sem deploy.

**A peça nova que torna isso possível: `ConfiguracaoValorService`** (`commons/configuracao/configuracao-valor.service.ts`), um módulo `@Global()` com um único método, `buscarNumero(chave, valorPadrao)`. Ele lê `configuracoes` (`id_usuario IS NULL`, `ativo = true`), converte para `Number`, e cai no `valorPadrao` se a chave não existir, estiver inativa, ou vier um valor que não converte para número finito. Esta é a primeira vez que a camada Nest lê `configuracoes` diretamente para uma regra de negócio (antes, quem lia era só a `05_regras_negocio.sql` via trigger de Postgres) - o padrão existe para ser reaproveitado por qualquer módulo futuro que precise do mesmo tipo de "valor configurável com fallback seguro".

**As 7 chaves, todas com `tipo = 'inteiro'` em `configuracoes`, seed em `07_seed_dados.sql` bloco `[07-G]`:**

| Chave | Papel | Valor padrão (seed) |
|---|---|---|
| `arquivo_tamanho_minimo_bytes` | Piso de sanidade - rejeita arquivo vazio/quase vazio | 100 |
| `arquivo_tamanho_maximo_imagem_bytes` | Teto para `image/jpeg`, `image/png`, `image/webp` | 8 388 608 (8 MB) |
| `arquivo_tamanho_maximo_documento_bytes` | Teto para `application/pdf` | 5 242 880 (5 MB) |
| `arquivo_cota_bytes_por_usuario` | Soma de todos os arquivos ativos de uma conta | 52 428 800 (50 MB) |
| `arquivo_limite_uploads_janela` | Máximo de uploads confirmados dentro da janela abaixo | 20 |
| `arquivo_janela_limite_uploads_minutos` | Tamanho da janela do limite acima | 1440 (24h) |
| `arquivo_intervalo_minimo_segundos` | Intervalo mínimo entre um upload e o próximo | 5 |

📌 **Os valores acima são só o ponto de partida, herdado da decisão de 01-09-2026** (baixados de 10MB/20MB para 8MB/5MB - o projeto roda no plano grátis do Supabase Storage, **1 GB de espaço total** e **50 MB de teto por arquivo individual** no próprio plano; números conferidos direto na documentação oficial: [Limits | Supabase Docs](https://supabase.com/docs/guides/storage/uploads/file-limits) e [Pricing | Supabase Docs](https://supabase.com/docs/guides/storage/pricing)). O valor de **verdade**, em produção, é sempre o que estiver em `configuracoes` - o admin pode alterar qualquer um destes 7 números pelo Painel Admin (tela Configurações, já genérica, zero código novo no front) a qualquer momento, sem deploy.

**`TAMANHO_MAXIMO_BYTES_ABSOLUTO` continua fixo no código, de propósito - não virou configurável.** É usado só como `@Max()` no DTO de `iniciar-upload`: uma validação **síncrona**, de forma, que roda antes de qualquer acesso a banco e não tem como ler `configuracoes`. Por isso ele é propositalmente **bem mais folgado** (100 MB) que qualquer teto real por tipo: se o admin configurar um teto maior que o padrão, a validação do DTO não pode ser o que barra isso antes mesmo do service conferir o valor de `configuracoes` de verdade. O teto de verdade, por tipo, é sempre o do service (`chaveConfigTamanhoMaximo(tipoMime)`).

**A cota é checada em DOIS pontos, com propósitos diferentes** (ambos agora lendo `arquivo_cota_bytes_por_usuario` via `ConfiguracaoValorService`):

| Onde | Como | Por quê |
|---|---|---|
| `iniciar-upload` | `bytesJaUsados >= COTA` (sem somar o novo arquivo) | Checagem **barata**, antes de gastar uma URL pré-assinada. Só evita o desperdício óbvio: quem já estourou a cota nem recebe URL. |
| `confirmar-upload` | `bytesJaUsados + tamanhoFinal > COTA` | A checagem **de verdade**, com o tamanho real pós-processamento. |

🧩 **O posicionamento exato da segunda checagem é deliberado: depois de processar, antes de gravar em `publico/`.** Checar **antes** do processamento seria injusto (rejeitaria um upload que cabe de sobra depois de comprimido); checar **depois** de já ter gravado em `publico/` deixaria arquivo órfão para trás quando estourasse. Estourou → o objeto pendente é apagado e vem 400.

🧩 **`Number()` obrigatório no resultado do `SUM`.** `SUM` de coluna `integer` volta `bigint` do Postgres, e o driver `pg` devolve `bigint` como **string** (para evitar perda de precisão silenciosa). Sem o `Number()`, `usoAtual + tamanhoFinal` **concatenaria texto** em vez de somar.

**Rate limit de upload - novo em 04-09-2026, duas proteções complementares** (checadas em `iniciar-upload`, contra a coluna `arquivo.criado_em` que já existia - nenhuma migração de schema foi necessária):

1. **Quantidade máxima de uploads dentro de uma janela de tempo** (`arquivo_limite_uploads_janela` a cada `arquivo_janela_limite_uploads_minutos`) - evita um usuário legítimo mas descuidado, ou um script, enchendo a conta de arquivos rápido demais. Complementar à cota de bytes, que sozinha não impede *muitos* arquivos pequenos.
2. **Intervalo mínimo entre um upload confirmado e o próximo início de upload** (`arquivo_intervalo_minimo_segundos`) - barra rajada (ex.: um script chamando `iniciar-upload` em loop) sem incomodar uso humano normal.

📌 **Mesmo espírito de outros pares já existentes no projeto:** `limite_tentativas_login`/`bloqueio_login_minutos` (`03_funcoes_seguranca.sql`, `[03-O]`) e `limite_denuncias_24h` - contagem numa janela, mais um intervalo mínimo, os dois configuráveis.

### 8.7 Remoção e avatar

**`ArquivoServiceRemove`** - *soft delete* no banco (`ativo = false`, `desativado_em`), nunca `DELETE` de linha: `06_grants.sql` só concede `INSERT`/`UPDATE` em `arquivo` (sem `DELETE`), e faz sentido - um arquivo referenciado por `arquivo_atualizacao`, `arquivo_recompensa` ou `usuario.id_imagem_perfil` não pode sumir do banco sem quebrar FK.

📌 **Mas os bytes no bucket são apagados de verdade.** O comentário explica por que isso é seguro: ninguém serve o arquivo pela chave sem antes passar pela checagem de `ativo` no banco; uma vez `ativo = false`, o dado já parou de aparecer em qualquer lugar do sistema. Falha ao apagar do bucket **não** desfaz o soft delete (a linha já ficou inativa, que é o que importa para a correção do sistema) - só vira um objeto órfão, e agora **com `logger.warn`**, não em silêncio.

**`ArquivoServiceResolveAvatar`** - 🗑️➡️✅ **SIMPLIFICADO (commit da Alexia, 05-09-2026):** antes tinha uma cadeia de 4 passos com um "avatar padrão do sistema" configurável (`configuracoes.avatar_padrao_chave`, editável pelo painel Admin) como fallback, e a resposta carregava um campo `padrao: boolean` distinguindo foto real de substituta. Removido de propósito - `AvatarUsuario` (front) já desenha iniciais com fundo colorido quando não há foto, então manter os dois mecanismos resolvendo o mesmo problema era complexidade duplicada (primeiro caso concreto validando a regra "apontar duplicidade de mecanismo" que o Lucas pediu pra adotar em toda auditoria). Hoje é só:
1. `id_imagem_perfil` aponta para um arquivo `ativo` → `{ url: <URL pública> }`.
2. `null`, ou aponta pra um arquivo removido/desativado → `{ url: null }` - o front resolve com iniciais, sem round-trip nenhum pra saber disso.

📌 **A chave `avatar_padrao_chave` foi removida do seed (05-09-2026) e do banco de produção (`DELETE`, 06-09-2026)** - não é mais um parâmetro válido em `configuracoes`, não confundir com nenhuma chave ativa.

📌 **`GET /arquivo/avatar/:idUsuario` é pública de propósito** (`@Publico()`): um visitante anônimo olhando um perfil ou os comentários de uma campanha precisa ver o avatar.

📌 **`UsuarioServiceUpdate` devolve `avatarUrl` já resolvida** na resposta do `PATCH`, para que o front só repasse o objeto e o cabeçalho reflita a troca na hora, sem recalcular nada.

📌 **Arquivo só fica se tiver dono (28-09-2026).**
- **Em palavras simples:** quando alguém escolhe uma foto, ela é enviada na hora, antes de clicar em Salvar. Se a pessoa desiste, a foto fica "largada" no armazenamento (um arquivo órfão, sem dono). Agora uma faxina diária apaga o que ficou largado por mais de 24 horas. E o banco confere, na hora de salvar, se a foto é mesmo de quem está salvando: antes, dava para "pegar emprestado" o arquivo de outra pessoa e depois apagá-lo.
- **Decisão:** o upload continua sendo confirmado antes de salvar (`POST /arquivo/upload/confirmar`), e o banco cuida das duas pontas: ao salvar a foto de perfil, a trigger `trg_valida_posse_imagem_perfil` (05, `[05-G]`) exige que o arquivo esteja ativo (90022), tenha sido enviado por quem está logado (92025) e não esteja em uso em outro lugar (91029). E o job `ArquivoServiceCleanOrphans` (4h) desativa e apaga do armazenamento o arquivo que ninguém adotou em 24h.
- **Motivo:** confirmar o arquivo na mesma operação que salva a conta tiraria a prévia instantânea da foto (ela só existe depois de processada e publicada). O prazo para adoção resolve o órfão sem mudar a tela. A trava de posse fecha um buraco real: antes, qualquer conta podia apontar a própria foto para o arquivo de outra pessoa e, pela posse que a foto de perfil dá em `pol_arquivo_update`, apagá-lo.
- **Caso-limite aceito:** um arquivo fica até 24h ocupando espaço (e contando na cota) antes de sumir. O admin que troca a foto de outra pessoa envia o arquivo ele mesmo, então passa na regra. Desde 29-09-2026 os anexos de atualização e de recompensa seguem a mesma regra de posse, e cada arquivo mora num lugar só (`fn_valida_posse_anexo`, ver `DOCUMENTACAO_BD.md` [05-G]): `POST /arquivo-atualizacao` com o arquivo de outra pessoa responde 403 (92025), e com um arquivo já usado em outro lugar, 409 (91029). Um dono novo de arquivo (tabela nova que aponte para `arquivo`) precisa entrar na função de órfãos e nas duas regras de posse.

### 8.8 Lembretes de infraestrutura (configurados no painel, não em código)

De `nest/.env.example` (bloco `STORAGE_*`):
1. O bucket precisa ser **público** (leitura) e servido por um **domínio separado** do site principal (`arquivos.<dominio>`, nunca `<dominio>/arquivos`) - assim, mesmo que algo malicioso escape, não roda "de dentro" do site nem alcança cookies/sessão.
2. **Regra de ciclo de vida** apagando tudo em `pendente/` com mais de 24h.
3. A lista de tipos aceitos é fechada no código; SVG nunca entra.

📌 **`nest/.env.example` existe (26-09-2026).** Lista todas as variáveis do `nest/.env` (banco, JWT, chaves do CPF, `STORAGE_*`) com o que cada uma faz e onde achar o valor, sem nenhum segredo. É o arquivo que a mensagem de erro do storage (*"Ver .env.example"*) cita. Copie para `nest/.env` e preencha; o `.env` continua fora do git.

---

## 9. Dado sensível no processo do Nest: CPF (`commons/seguranca`)

Este é o único dado do sistema que é **cifrado** (não apenas hasheado). O raciocínio completo - por que Node e não `pgcrypto`, por que duas chaves, o que é um "índice cego" - está em `DOCUMENTACAO_BD.md`, seção `[01-D]`. Aqui fica só o que o backend implementa.

`commons/seguranca/cpf-cifra.util.ts` expõe quatro funções:

| Função | O que faz |
|---|---|
| `normalizarCpf()` | Só dígitos - `"123.456.789-09"` e `"12345678909"` viram o mesmo valor antes de cifrar/indexar |
| `cifrarCpf()` | AES-256-GCM → `"v1:<iv>:<tag>:<ciphertext>"`, cada parte em base64 |
| `decifrarCpf()` | Volta ao CPF original; rejeita formato desconhecido com erro explícito |
| `calcularHashCpf()` | HMAC-SHA256 → o "índice cego", determinístico, que sustenta o `UNIQUE` |

📌 **Duas funções separadas porque o problema é duplo.** O CPF precisa poder **voltar** ao valor original (a API de pagamento/KYC do RF-015 precisa dele), então não pode ser hash. Mas cifra de verdade é **não-determinística** de propósito - o mesmo CPF cifrado duas vezes dá resultados diferentes - o que impede `UNIQUE` e busca por igualdade. `cpf_hash` (HMAC, determinístico e irreversível) resolve o segundo problema sem estragar o primeiro.

📌 **HMAC, nunca `sha256()` puro.** CPF tem só 10⁹ combinações válidas (os 2 últimos dígitos são calculados a partir dos 9 primeiros) - espaço pequeno o bastante para pré-calcular o hash de **todos** os CPFs possíveis e reverter o hash na prática. O HMAC exige uma chave secreta como segundo ingrediente, e o espaço de chaves possíveis é imensamente maior.

📌 **Duas chaves no `.env`, nunca uma: `CPF_ENCRYPTION_KEY` e `CPF_INDEX_KEY`.** Elas têm ciclos de vida diferentes: rotacionar a de cifra é uma migração tranquila (decifra com a velha, cifra com a nova, linha a linha); rotacionar a de índice invalida **todo** `cpf_hash` de uma vez e exige recalcular a coluna inteira numa operação só. Chaves separadas evitam que rotacionar uma force a outra.

📌 **`chaveDeCifra()` passa a variável do `.env` por SHA-256 antes de usar** - AES-256 exige exatamente 32 bytes, e uma frase digitada à mão quase nunca tem esse tamanho. `chaveDeIndice()` **não** faz isso, porque HMAC aceita chave de qualquer tamanho nativamente.

📌 **O prefixo `v1:` não é dado criptográfico - é rótulo de versão da receita.** Se um dia o algoritmo mudar, `decifrarCpf()` olha o prefixo e escolhe a receita: linhas `v1:` antigas e `v2:` novas convivem na mesma coluna, e a migração pode ser gradual.

**Validação de formato** - `cpf-validador.util.ts` + `cpf-valido.decorator.ts` (`@IsCpf()`), o **primeiro validador customizado do projeto** (todos os outros módulos usavam só decorators prontos). ⚠️ Ele valida **formato** (dígito verificador), **nunca existência real** - não há consulta a nenhuma fonte externa. Registrado como lacuna consciente em `PENDENCIAS e correcoes.md`, item 745.

---

## 10. Módulos de apoio do painel: `27-log-auditoria`, `28-dashboard`, `5-termo-uso`

Módulos pequenos, mas reais e em uso pelo painel administrativo.

### `27-log-auditoria` (9 arquivos, 2 endpoints)

Somente leitura - a escrita em `log_auditoria` é feita por trigger genérica no banco (letra `L` do `DOCUMENTACAO_BD.md`), nunca pelo Nest.

- **`GET /log-auditoria?tabela=<x>`** - histórico de **uma** tabela, para o botão "Ver log" no fundo de cada listagem. Faz `leftJoin` com `usuario` para trazer `nome_responsavel` junto. Usa `paginar()` com `TAMANHO_PADRAO_LOG = 20` próprio. 📌 O comentário explica por que 20 e não o teto de 500: *aqui não é um teto "para nunca baixar tudo por acidente", é o tamanho de verdade do painel* - mostrar as últimas 20 alterações é o caso de uso real.
- **Retenção do log, sem endpoint:** `LogAuditoriaServiceClean` é um `@Cron` diário (3h) que só chama `limpar_log_auditoria()` (ver `DOCUMENTACAO_BD.md` `[05-L]`); toda a regra, inclusive o prazo lido de `configuracoes`, mora no banco. Se o Nest ficar dormindo (hospedagem gratuita), o job roda na próxima vez que acordar; atrasar só faz a tabela guardar mais um pouco.
- **`GET /log-auditoria/minha-atividade`** - últimas 10 ações do **próprio** usuário, de **qualquer** tabela, para o sino "Atividade recente" do cabeçalho. Não recebe `tabela`; é *"o que EU fiz"*, não *"o histórico de uma tabela"*.

📌 **A autorização é 100% RLS, como sempre.** `pol_log_auditoria_select` exige `tem_permissao('log_visualizar')`; sem ela a query volta **vazia**, não dá erro. O comentário registra a dependência: a policy foi ampliada para deixar qualquer usuário ver as próprias linhas - sem essa mudança aplicada no banco, `minha-atividade` volta vazia para quem não é admin, mesmo sendo autor das próprias linhas.

### `28-dashboard` (4 arquivos, 1 endpoint)

**`GET /dashboard/resumo`** - uma única chamada a `SELECT * FROM contar_metricas_dashboard()` (bloco `[03-M]`). Inclui `campanhasParaRevisaoScore`: campanhas na fila de aprovação cujo pesquisador está abaixo do score mínimo, só um sinal para o admin.

📌 **Por que uma função `SECURITY DEFINER` em vez de contar no Nest.** A função bypassa deliberadamente a RLS restritiva de `usuario`/`configuracoes`. Sem isso, o total mostrado **dependeria de quem está logado** - errado para um card que diz "total do sistema".

Devolve `totalUsuarios`, `totalPesquisadores`, `totalPapeis`, `totalPermissoes`, `totalConfiguracoes`, `totalCampanhas`, `sessoesAtivas` e `notificacoesPendentes`.

⚠️ **`notificacoesPendentes` é `null` fixo** - `26-notificacao` não existe. Há um precedente comentado no código: `totalCampanhas` **também** era `null` fixo ("campanha ainda não existe") e continuou `null` mesmo depois de `12-campanha` ser construído, até alguém perceber e atualizar a função do banco. **Quando `26-notificacao` existir, este campo não vai começar a funcionar sozinho** - exige atualizar `contar_metricas_dashboard()` no `.sql` *e* trocar o `null` aqui.

### `5-termo-uso` (19 arquivos, 7 endpoints)

Versões dos termos de uso, de 2 tipos: `cadastro` (o termo da conta, que cobre também as contribuições e é confirmado a cada uma, com a versão registrada em `aceite_termo_contribuicao`) e `upgrade_pesquisador`; cada tipo tem no máximo uma versão **vigente** (`ativo = TRUE`). Só `GET /termos-uso/ativo?tipo=...` é público; o resto exige login e a permissão é decidida pela RLS.

- **`GET /termos-uso/ativo?tipo=X`** devolve a versão vigente do tipo (`tipo` é obrigatório). Estruturalmente importante: `AuthServiceRegister` injeta `TermoUsoServiceFindActive` para gravar o aceite do termo **ativo resolvido pelo servidor**, nunca um id vindo do cliente.
- **`GET /termos-uso`** lista todas as versões dos 2 tipos misturadas, por id crescente; **`GET /termos-uso/:id`** busca uma.
- **`POST /termos-uso` (Criar)** só cria rascunho: sempre `ativo = FALSE`, nunca ativa sozinho nem mexe em outra linha. O fluxo é criar, a equipe revisar o texto e só então um administrador tornar a versão vigente.
- **`PATCH /termos-uso/:id/ativar`** torna a versão a vigente do seu tipo e, na mesma transação, desativa a vigente anterior do mesmo tipo (idempotente se o alvo já é a vigente). Serve tanto para promover um rascunho quanto para voltar a uma versão antiga.
- **`PATCH /termos-uso/:id` (Alterar)** só edita `conteudo`, e só enquanto **ninguém aceitou** aquela versão; depois do primeiro aceite a versão fica somente leitura, para preservar o valor probatório do que foi aceito. Quem recusa é o banco (`trg_termos_de_uso_protege_aceito`, 409 `91033`). `versao` e `tipo` são imutáveis.
- **`DELETE /termos-uso/:id`**: nunca apaga a versão vigente (sempre precisa existir uma por tipo) nem versão com aceite registrado (409 `91032`, RF-091). Não existe exclusão forçada.
- **`POST /termos-uso/:id/aceitar`** (RF-015): quem já tem conta aceita a versão vigente nova do Termo de Uso. Só aceita o id da vigente de `cadastro` (outro id responde 409, a versão mudou enquanto a pessoa lia); aceitar de novo não é erro.

---

## 11. Bootstrap, segurança HTTP e infraestrutura (`main.ts`, `app/`)

`main.ts` faz quatro coisas, todas com motivo registrado em comentário:

1. **`app.enableCors()`** - o front (Vite, outra origem) não chamaria a API sem isso.
2. **`set('trust proxy', 1)`** - 📌 sem isso, **em produção atrás de qualquer proxy reverso**, o Express enxerga o IP do **proxy** em toda requisição. Dois efeitos ruins, invisíveis em localhost (onde não há proxy, então nunca aparecem em teste): (a) o `ThrottlerGuard` passaria a contar **todo mundo como o mesmo IP** - o limite de 5/60s viraria global, e uma pessoa tentando logar travaria o login de todos; (b) `sessao.ip` e `usuario.ultimo_login_ip` gravariam sempre o IP do proxy, deixando a auditoria de login inútil. O valor `1` confia só no primeiro salto; aumentar só se o deploy tiver proxies encadeados.
3. **`app.use(helmet())`** - acrescenta cabeçalhos de segurança que o Express não manda sozinho (HSTS, `X-Content-Type-Options`, `X-Frame-Options`, CSP básico). Sem configuração, porque os padrões já cobrem o caso de uso (API pura, sem servir HTML).
4. **`useGlobalPipes(new ValidationPipe(...))`** - ver §6.1.

O `bootstrap().catch()` no fim imprime a falha e chama `process.exit(1)` - 📌 é ali que o health-check de `DatabaseModule.onModuleInit()` (conectar como `app_nestjs`) aparece se falhar.

**`GET /health`** (`app/health.controller.ts`) - roda `SELECT 1` no `Pool`. Sem login. 📌 Usa **`@Inject(PG_POOL)` direto**, não `DatabaseService.getDb()`, e o comentário justifica: um health check tem que testar a **fundação** (o Pool abre conexão e roda query?), não passar pela maquinaria de transação por requisição, que é sobre RLS/auditoria de quem fez o quê - irrelevante aqui, ninguém "fez" nada. 📌 Devolve **503**, não 500, quando o banco está fora: a aplicação está de pé, é a **dependência** que caiu - e é essa distinção que a plataforma de deploy usa para decidir entre reiniciar o processo (500, bug de código) ou só esperar (503, o banco volta sozinho).

**Não existe `GET /` de exemplo.** O `AppModule` só tem o `HealthController`; o "hello world" do scaffold do Nest (`AppController`/`AppService` e os testes de gerador) não faz parte do projeto. `jest` está com `passWithNoTests`, porque não há teste de unidade no `nest/`.

### Variáveis de ambiente (nomes; valores nunca vão para o repositório)

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | conexão do app - **precisa ser `app_nestjs`**, ou o boot falha |
| `DATABASE_URL_MIGRATIONS` | conexão com privilégio de DDL, só para `npm run db:migrate` |
| `PORT` | porta HTTP (padrão 3000) |
| `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN` | assinatura e validade do access token |
| `CPF_ENCRYPTION_KEY`, `CPF_INDEX_KEY` | cifra e índice cego de CPF (seção 9) |
| `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`, `STORAGE_PUBLIC_BASE_URL`, `STORAGE_REGION`, `STORAGE_FORCE_PATH_STYLE` | bucket S3-compatível (seção 8) |
| `NODE_ENV` | muda o limite do throttler e o retorno de `tokenVerificacaoEmailDev` |

---

## 12. Migrations: `aplicar-migrations.script.ts`

`commons/database/aplicar-migrations.script.ts` **não é um provider do Nest** - sem `@Injectable`, nunca importado por módulo nenhum, nunca roda no boot. É um script standalone (`npm run db:migrate`).

**O problema que ele resolve:** os 8 arquivos de `arquivos_banco_dados/*.sql` são colados à mão no SQL Editor do Supabase, **sem nenhum registro de qual arquivo já rodou em qual banco**. Com dois ambientes Supabase separados em uso (um por integrante do time), não havia garantia de que os dois estavam no mesmo estado.

**O que ele faz:** cria a tabela `schema_migrations` (`nome_arquivo` PK, `hash`, `aplicado_em`, `aplicado_por`), lê os 8 `.sql` em ordem, calcula SHA-256 de cada um e decide:
- nunca rodou → **aplica e registra**;
- já rodou, mesmo conteúdo → **pula**;
- já rodou, conteúdo **mudou** → **avisa e para**, nunca reaplica sozinho.

**O que ele explicitamente NÃO faz:** não substitui nem reformata os `.sql` (continuam texto puro), e não os converte para Kysely - são executados como SQL bruto via `pg`, verbatim. 📌 O motivo: são blocos já prontos, com função/trigger em `$$...$$`, e o jeito confiável é mandar o texto inteiro de uma vez (protocolo *simple query*, que suporta múltiplas instruções separadas por `;` - o que só funciona quando não se usa parâmetro nenhum, exatamente o caso aqui).

📌 **`schema_migrations` não está em nenhum dos 8 arquivos numerados**, de propósito: ela precisa existir **antes** de qualquer um deles ser rastreado, então não pode depender de nenhum.

📌 **Conexão separada obrigatória.** Usa `DATABASE_URL_MIGRATIONS`, nunca `DATABASE_URL` - `app_nestjs` é propositalmente sem privilégio de DDL, e é isso que garante que a RLS vale para ela em runtime. Migration precisa de credencial com privilégio de verdade.

**`npm run db:migrate:adotar`** - o passo de "dia zero": **não executa nada**, só grava que os 8 arquivos "já estavam aplicados", com o hash de agora. Cada pessoa roda uma vez no próprio banco. Sem isso, o primeiro `db:migrate` normal tentaria recriar do zero as tabelas que já existem e falharia.

⚠️ **`--adotar` não confere se o banco de verdade tem tudo** que os arquivos descrevem - só estabelece a linha de base. O próprio script avisa isso na saída.

🐛➡️✅ **Bug real, achado pelo Lucas rodando `--adotar` de verdade contra o Supabase (05-09-2026), corrigido no mesmo dia.** `listarArquivosSqlEmOrdem()` filtrava só "termina em `.sql`" - como `arquivos_banco_dados/ATUALIZAR O SUPABASE.sql` mora na mesma pasta dos 8 numerados, ele também foi listado, hasheado e "adotado" como se fosse um 9º arquivo rastreado. O problema de fundo: `ATUALIZAR O SUPABASE.sql` é um rascunho **vivo** (cresce a cada ajuste pequeno - RF-108, limites de upload, validade de sessão configurável, etc.), nunca um bloco fechado como os 8 numerados - tratá-lo como um deles faria o hash mudar a cada adição, disparando pra sempre o aviso de "conteúdo mudou, não reaplicado" só por causa dele, mesmo sem nenhum problema real. **Corrigido:** o filtro agora exige exatamente dois dígitos no início do nome (`/^\d{2}_.*\.sql$/`) - só `01_...` a `08_...` passam; `ATUALIZAR O SUPABASE.sql` nunca mais entra na lista. A linha órfã que o `--adotar` já tinha gravado pra ele em `schema_migrations` (antes da correção) fica inofensiva, sem efeito - o script simplesmente não procura mais por esse nome de arquivo.

---

## 13. Inventário de rotas HTTP

120 handlers. `AUTH` = a rota exige login (o padrão, `AuthGuardRequireAuth` global); `pub` = a rota tem `@Publico()` (o que **não** significa "sem proteção": significa que quem protege é a RLS, e que anônimo é um caso legítimo).

| | Método | Rota |
|---|---|---|
| pub | GET | `/health` |
| **Auth** | | |
| pub | POST | `/auth/cadastro` *(throttled)* |
| pub | POST | `/auth/login` *(throttled)* |
| pub | POST | `/auth/refresh` |
| pub | POST | `/auth/logout` |
| pub | POST | `/auth/verificar-email` |
| AUTH | GET · DELETE | `/auth/sessoes` |
| AUTH | DELETE | `/auth/sessoes/:id` |
| **Usuário e RBAC** | | |
| AUTH | POST | `/usuario` |
| AUTH | GET | `/usuario` |
| AUTH | GET | `/usuario/:id` |
| AUTH | PATCH · DELETE | `/usuario/:id` |
| AUTH | GET | `/usuario/:id/logins` |
| AUTH | GET | `/usuario/:id/suspensao` |
| AUTH | GET | `/usuario/:id/termos-aceitos` |
| AUTH | GET | `/usuario/eu/exportar-dados` |
| AUTH | POST | `/usuario/:id/suspender` · `/usuario/:id/revogar-suspensao` · `/usuario/:id/desbloquear` |
| AUTH | GET | `/papel` · `/permissao` · `/papel-permissao` |
| AUTH | PATCH | `/papel/:id` |
| AUTH | POST | `/papel-permissao` |
| AUTH | DELETE | `/papel-permissao/:idPapel/:idPermissao` |
| AUTH | GET | `/usuario-papel` · `/usuario-papel/:idUsuario` |
| AUTH | POST | `/usuario-papel` |
| AUTH | DELETE | `/usuario-papel/:idUsuario/:idPapel` |
| AUTH | POST | `/usuario-papel/:idUsuario/:idPapel/suspender` · `.../revogar-suspensao` |
| **Perfil e links** | | |
| pub | GET | `/perfil-pesquisador` · `/perfil-pesquisador/:id` · `/perfil-pesquisador/:id/score` |
| AUTH | POST · PATCH | `/perfil-pesquisador` |
| AUTH | POST | `/perfil-pesquisador/:id` *(criar em nome de outro, distinta do `POST /perfil-pesquisador` self-service acima)* |
| AUTH | PATCH | `/perfil-pesquisador/:id` *(alterar o perfil de outro pesquisador; o `PATCH /perfil-pesquisador` sem id é o self-service)* |
| AUTH | PATCH | `/perfil-pesquisador/:id/cpf` *(ADICIONADA 07-09-2026, RF-017 - correção de CPF, ação de suporte/admin)* |
| AUTH | GET · POST | `/perfil-pesquisador/:id/suspensao` · `/perfil-pesquisador/:id/suspender` · `/perfil-pesquisador/:id/reativar` *(ADICIONADAS 07-09-2026 - suspende só o PODER de pesquisador, não bloqueia login; `suspender` exige corpo `{ate, motivo}`)* |
| pub | GET | `/link-academico` |
| AUTH | POST | `/link-academico` · `/link-academico/:idUsuario` |
| AUTH | PATCH · DELETE | `/link-academico/:id` |
| **Catálogos** | | |
| pub | GET | `/area-conhecimento` · `/area-conhecimento/:id` |
| AUTH | POST | `/area-conhecimento` |
| AUTH | PATCH · DELETE | `/area-conhecimento/:id` |
| pub | GET | `/tipo-link` · `/tipo-link/:id` |
| AUTH | POST | `/tipo-link` |
| AUTH | PATCH · DELETE | `/tipo-link/:id` |
| pub | GET | `/motivo-denuncia` · `/motivo-denuncia/:id` |
| AUTH | POST | `/motivo-denuncia` |
| AUTH | PATCH · DELETE | `/motivo-denuncia/:id` |
| pub | GET | `/configuracoes` · `/configuracoes/:id` |
| AUTH | POST | `/configuracoes` |
| AUTH | PATCH · DELETE | `/configuracoes/:id` |
| pub | GET | `/termos-uso/ativo` |
| AUTH | GET | `/termos-uso` · `/termos-uso/:id` |
| AUTH | POST | `/termos-uso` · `/termos-uso/:id/aceitar` |
| AUTH | PATCH | `/termos-uso/:id` · `/termos-uso/:id/ativar` |
| AUTH | DELETE | `/termos-uso/:id` |
| **Campanha e satélites** | | |
| pub | GET | `/campanha` · `/campanha/:id` |
| AUTH | POST | `/campanha` · `/campanha/:idUsuario` *(criar em nome de outro, Campo de Testes)* |
| AUTH | PATCH · DELETE | `/campanha/:id` |
| AUTH | POST | `/campanha/:id/enviar` · `/campanha/:id/deslizar-datas` *(21-09-2026, ciclo de vida da campanha)* |
| AUTH | POST | `/campanha/:id/aprovar` · `/campanha/:id/rejeitar` · `/campanha/:id/forcar-exclusao` |
| AUTH | GET | `/historico-rejeicao` |
| pub | GET | `/orcamento-campanha` · `/marco-cronograma` |
| AUTH | POST | `/orcamento-campanha` · `/marco-cronograma` |
| AUTH | PATCH · DELETE | `/orcamento-campanha/:id` · `/marco-cronograma/:id` |
| pub | GET | `/atualizacao-campanha` · `/link-atualizacao` · `/arquivo-atualizacao` |
| AUTH | POST | `/atualizacao-campanha` · `/link-atualizacao` · `/arquivo-atualizacao` |
| AUTH | PATCH | `/atualizacao-campanha/:id` · `/link-atualizacao/:id` |
| AUTH | DELETE | `/link-atualizacao/:id` |
| pub | GET | `/comentario` |
| AUTH | POST | `/comentario` |
| AUTH | PATCH | `/comentario/:id` |
| AUTH | GET · POST | `/seguir-campanha` |
| AUTH | DELETE | `/seguir-campanha/:idCampanha` |
| **Arquivo** | | |
| AUTH | POST | `/arquivo/upload/iniciar` · `/arquivo/upload/confirmar` |
| pub | GET | `/arquivo/:id` · `/arquivo/avatar/:idUsuario` |
| AUTH | DELETE | `/arquivo/:id` |
| **Painel** | | |
| AUTH | GET | `/log-auditoria` · `/log-auditoria/minha-atividade` |
| AUTH | GET | `/dashboard/resumo` |

📌 **Rotas administrativas exigem login (não são `@Publico()`).** `GET /usuario`, `GET /usuario/:id`, `GET /usuario-papel`, `GET /usuario-papel/:idUsuario` e `GET /dashboard/resumo` exigem login. Não vale o argumento "só o admin chega na tela": a API não sabe de tela nenhuma, qualquer requisição direta (um `curl`) chega na rota sem passar pelo `/admin`, e o `AuthGuardJwt` global deixa passar como anônima a requisição sem cabeçalho `Authorization` (comportamento documentado nele). Sobra a RLS, e a RLS de `usuario` é permissiva de propósito (o login precisa achar o usuário pelo e-mail antes de existir alguém autenticado); sem o guard, um visitante anônimo obteria os e-mails de todos os usuários, quem é administrador e as métricas internas.

📌 **Permissão além do login (25-09-2026).** O guard só impede o anônimo, e `pol_usuario_select` é permissiva de propósito, então a permissão é checada no Nest por `AutorizacaoService` (`commons/seguranca/autorizacao.service.ts`, global, usa `tem_permissao()` e `id_usuario_atual()` da própria sessão): `GET /usuario` exige `usuario_visualizar_sensivel`; `GET /usuario/:id` e `GET /usuario/:id/logins` exigem ser o próprio usuário ou ter `usuario_visualizar_sensivel`; `GET /usuario/:id/suspensao` e `GET /perfil-pesquisador/:id/suspensao` exigem ser o próprio ou `usuario_suspender`. Sem isso: 403 com mensagem em português. A checagem de `GET /usuario/:id` fica no controller, e não no service, porque login e refresh reaproveitam `UsuarioServiceFindOne` antes de existir alguém autenticado. `GET /usuario-papel` e `GET /usuario-papel/:idUsuario` são decididos pela RLS (`pol_usuariopapel_select`, ver `[04-D-4b]`) e `GET /dashboard/resumo` por `contar_metricas_dashboard()` (`relatorio_visualizar`, ERRCODE 92011). `GET /usuario/:id/logins` deixou de ser público: a tabela `sessao` é lida por qualquer sessão (o refresh precisa achar o token antes de existir usuário atual), então a RLS não protegia o histórico de login. `GET /usuario/:id/termos-aceitos` também exige login (a RLS de `usuario_termo` já limitava as linhas ao próprio ou a quem tem a permissão). Continuam públicos os catálogos (área, motivo, tipo de link). A solução maior, para depois: o login passa a usar uma função `SECURITY DEFINER` que devolve só o necessário para autenticar a partir do e-mail, e `pol_usuario_select` pode então ser fechada para anônimo no próprio banco.

---

## 14. O que ainda não existe (pastas vazias)

Conferido em 21-09-2026: as 8 pastas abaixo contêm **exatamente um arquivo `.gitkeep`** e **zero `.ts`**. (`21-historico-rejeicao` saiu da lista: ganhou código em 14-09-2026.)

| Pasta | Grupo em `PROXIMOS_MODULOS.md` |
|---|---|
| `4-mail` | Comunicação |
| `18-recompensa` | Engajamento |
| `19-denuncia` | Moderação |
| `20-solicitacao-encerramento` | Moderação |
| `22-contribuicao` | Pagamento |
| `23-repasse` | Pagamento |
| `24-auditoria-financeira` | Pagamento |
| `26-notificacao` | Comunicação |

🗑️ **`27-resources` não está mais na lista - removido em 04-09-2026.** Era sobra do esqueleto de pastas herdado do modelo da disciplina (Programação para Web 2): lá, `resources` é um catálogo estático de metadados de rota (`GET /rest/resources`, uma lista hardcoded de endpoint/verbo por entidade, consumida pelo React pra montar URL sem hardcode) - só faz sentido porque aquele sistema segue uma convenção rígida e uniforme (toda entidade com exatamente 5 endpoints: listar/criar/buscar/alterar/excluir). O CrowdAcadêmico já resolve o mesmo problema de origem (não hardcodar URL no React) de outro jeito - um arquivo `<modulo>.api.js` por módulo, com funções nomeadas - e as rotas daqui não são uniformes o bastante pra caber no molde do `resources` (upload em 2 passos, `/dashboard/resumo` sem entidade, sub-rotas como `/usuario/:id/desbloquear`). Pasta vazia (só `.gitkeep`) desde sempre, sem nenhum código ou decisão ligando ela ao produto - removida, não é lacuna.

📌 **Este documento descreve o que EXISTE.** O que falta, a ordem sugerida e o porquê de cada adiamento estão em **`PROXIMOS_MODULOS.md`**, que é o dono desse assunto e está atualizado. Não duplicar aqui.

Três consequências do que falta são visíveis dentro do código já escrito, e valem registro:

- **`4-mail` bloqueia dois fluxos prontos no banco.** Verificação de e-mail e recuperação de senha têm tabela, índice e função - e o cadastro **já grava** a linha em `verificacao_email`. Só ninguém envia o e-mail. (`PENDENCIAS e correcoes.md`, item 6.)
- **`26-notificacao` mantém `notificacoesPendentes: null`** no dashboard (§10).
- **`22-contribuicao`/`23-repasse`/`24-auditoria-financeira`** são o Grupo 8, por último de propósito - a decisão de gateway de pagamento ainda não foi tomada. ⚠️ E é justamente aí que mora a pendência de segurança mais séria em aberto: **`auditoria_financeira` e `repasse` têm policies de escrita `USING (true)` - a RLS não valida quem grava.** Num sistema onde a RLS é a única camada de autorização, essas duas tabelas são o buraco no desenho. A defesa proposta (item 9 de `PENDENCIAS e correcoes.md`) é isolar a escrita num único service interno do Nest, chamado só pelo webhook do gateway, **nunca exposto como endpoint CRUD genérico** - quem construir esses módulos precisa ler aquele item antes de começar.

---

## 15. Dependências: o que cada uma faz e por que está aqui

A tabela da seção 1.1 já dá o resumo de uma linha por peça. Este capítulo aprofunda o **porquê** - a alternativa que foi preterida e o motivo, sempre que isso está determinável pelo que o código realmente faz (não é uma lista de "achismo de mercado", é o papel real que cada pacote cumpre neste projeto específico).

### 15.1 Núcleo do framework - exigido pelo NestJS, não é escolha do projeto

`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `reflect-metadata`, `rxjs`. Essas cinco não representam uma decisão de arquitetura - são o próprio NestJS. `@nestjs/platform-express` escolhe **Express** como servidor HTTP por baixo (a alternativa seria `@nestjs/platform-fastify`); nada neste projeto depende de recurso exclusivo de Express, então a escolha é a opção padrão/mais documentada, não uma necessidade técnica específica. `reflect-metadata` existe porque o Nest usa decorators (`@Controller`, `@Injectable`, `@Body`) para descrever metadado de tipo em tempo de execução - sem ele, a injeção de dependência do framework simplesmente não funciona. `rxjs` é a base dos `Observable` que interceptors/pipes do Nest usam internamente; o código deste projeto quase não usa RxJS diretamente (não há stream de evento nem programação reativa de propósito aqui), é consumido pela infraestrutura do framework. ⚠️ `nest/package.json` tem `"overrides": { "multer": "^2.4.0" }` (21-09-2026): `@nestjs/platform-express` fixa `multer` em versão exata e vulnerável (4 avisos de negação de serviço). O sistema nunca executa o `multer` (o upload é por URL pré-assinada e não passa pelo Nest), então o override é higiene de `npm audit` (de 6 vulnerabilidades altas para 0). No dia em que alguma rota usar `FileInterceptor`, ele deixa de ser cosmético. Não remover. Detalhe em `ACHADOS_PARA_DISCUTIR.md`.

### 15.2 Banco de dados - `kysely` + `pg`

Já justificado com profundidade na seção 1.1 (📌 "Por que Kysely e não TypeORM/Prisma"): o banco carrega regra de negócio de verdade (triggers, RLS, `SECURITY DEFINER`), e um ORM que tenta ser dono do schema brigaria com isso a cada migração. Reforço aqui: **`kysely` não conecta ao banco sozinho** - ele monta SQL tipado e delega a execução para o driver `pg`, usado tanto pelo `Pool` compartilhado (`commons/database/database.module.ts`) quanto pela conexão única por requisição do `GlobalDbInterceptor` (seção 2). Sem `pg`, não haveria como abrir a transação manual (`BEGIN`/`set_config`/`COMMIT`) que a RLS por sessão exige - nenhum ORM tradicional expõe esse nível de controle sobre uma única conexão dedicada por requisição sem gambiarra.

### 15.3 Contexto de requisição - `nestjs-cls`

Único propósito: carregar a conexão/transação da requisição atual "por fora", via `AsyncLocalStorage`, sem que nenhum service precise receber ou repassar esse dado manualmente. Já comparado com a alternativa (`Scope.REQUEST` nativo do Nest) na seção 2.2 - resumindo aqui: `Scope.REQUEST` contaminaria toda a árvore de injeção que toca banco, exigindo que cada módulo novo lembre de marcar o escopo certo; esquecer isso uma vez é um bug silencioso. `nestjs-cls` evita essa categoria inteira de erro.

### 15.4 Autenticação - `@nestjs/jwt` + `bcrypt`

`@nestjs/jwt` assina e verifica o access token (JWT de curta duração, seção 3). `bcrypt` faz duas coisas neste projeto: o hash de senha de login (`usuario.senha_hash`) e o hash do **segredo do refresh token** (formato `"<id>.<segredo>"`, onde só o hash do segredo é persistido em `sessao`) - a mesma função de hash resolve os dois casos porque os dois são "comparar um segredo que o cliente apresenta contra um valor irreversível salvo", exatamente o problema que bcrypt (com salt, lento de propósito contra força bruta) resolve bem. Não há dependência de biblioteca alternativa de hash (`argon2`, por exemplo) neste projeto - `bcrypt` é a escolha, provavelmente por ser o padrão mais estabelecido/documentado do ecossistema Node para esse problema, não algo que o código explica com um comentário dedicado.

### 15.5 Configuração - `@nestjs/config`

Carrega variáveis de ambiente (`.env`) através do `ConfigService`, injetável em qualquer service - é o que faz `STORAGE_ENDPOINT`, `JWT_SECRET`, `CPF_ENCRYPTION_KEY` etc. chegarem ao código sem nenhum `process.env.X` espalhado pelo projeto. Consequência prática: qualquer variável nova de configuração vira só mais uma leitura via `ConfigService`, sem precisar mexer em nenhum outro lugar.

### 15.6 Validação - `class-validator` + `class-transformer`

`class-validator` é o motor por trás de todo decorator de validação usado nos DTOs de request (`@IsString`, `@IsIn`, `@Max`, `@IsEmail` etc., seção 6) - é o que o `ValidationPipe` global (`main.ts`) executa antes de qualquer handler rodar. `class-transformer` converte o JSON cru da requisição numa instância de classe de verdade (necessário para os decorators do `class-validator` funcionarem por cima de um objeto tipado, não um objeto genérico). As duas bibliotecas são do mesmo autor e projetadas para trabalhar juntas - não é comum usar uma sem a outra no ecossistema Nest.

### 15.7 Segurança HTTP - `helmet` + `@nestjs/throttler`

`helmet` aplica um conjunto de cabeçalhos HTTP de segurança (proteção contra clickjacking, sniffing de MIME type, etc.) com uma linha de configuração - é a forma padrão de resolver essa categoria de proteção sem reimplementar cabeçalho por cabeçalho. `@nestjs/throttler` implementa limite de requisições por IP; hoje aplicado especificamente em `POST /auth/login` (e no cadastro, ver seção 3) - mitiga força bruta de senha e criação de conta em massa **na borda HTTP**, antes mesmo de a lógica de `registrar_falha_login()` (banco, seção 4) entrar em ação. As duas camadas não são redundantes: o throttler limita **tentativas por IP**, a função de banco limita **tentativas por conta** - um ataque distribuído (muitos IPs, uma conta) só é pego pela segunda; um ataque de credential-stuffing (um IP, muitas contas) só é pego pela primeira.

### 15.7b Agendamento - `@nestjs/schedule`

Adicionado em 05-09-2026 pra fechar o RF-057 (encerramento automático de campanha vencida) - até então a função de banco existia, mas nada a chamava (ver §7.4, `CampanhaServiceCloseExpired`). É o pacote oficial do NestJS pra `@Cron`/`@Interval`/`@Timeout` - registra um agendador de verdade por trás do decorator via `ScheduleModule.forRoot()` (uma vez, em `AppModule`). Consumidores hoje: os 4 jobs listados em §7.4 (`CampanhaServiceCloseExpired` e `PerfilPesquisadorServiceReactivateExpired` a cada 15 minutos, `CampanhaServiceExpireDrafts` e `CampanhaServiceExpireRejected` de hora em hora).

### 15.8 Armazenamento de arquivo - `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` + `sharp`

Os dois pacotes da AWS **não implicam usar a AWS** - são o cliente do protocolo S3, que o Supabase Storage (provedor atual, seção 8.2), Cloudflare R2, Backblaze B2 e MinIO também falam. A escolha de usar o SDK oficial da AWS em vez de escrever chamada HTTP crua contra a API S3 é puro pragmatismo: é o cliente mais maduro/testado do protocolo, mesmo apontado para um provedor que não é a AWS. `s3-request-presigner` é o que gera a URL pré-assinada de upload (seção 8.3) - sem ele, o Nest precisaria proxiar o binário do arquivo inteiro através de si mesmo, exatamente o risco que o desenho em 2 passos evita (processo Node ocupado segurando upload grande). `sharp` é o processamento de imagem no servidor (seção 8, redimensionar + converter pra WebP + remover EXIF) - rápido porque roda sobre `libvips` (biblioteca C nativa), não JavaScript puro; o preço dessa velocidade é distribuir binário pré-compilado por sistema operacional, por isso o `node_modules` nunca pode ser commitado nem copiado entre máquinas (precisa rodar `npm install` no próprio ambiente de destino).

### 15.9 Dependências de desenvolvimento (resumo, sem aprofundar cada uma)

Nenhuma delas roda em produção - ficam de fora do processo que o Render executa. Agrupadas por função, não por ordem alfabética:

| Grupo | Pacotes | Papel |
|---|---|---|
| Linguagem/compilação | `typescript`, `ts-node`, `ts-loader`, `tsconfig-paths`, `source-map-support` | Compila/roda TypeScript; `source-map-support` faz stack trace de erro apontar pra linha do `.ts` original, não pro `.js` gerado. |
| Qualidade de código | `eslint`, `@eslint/js`, `@eslint/eslintrc`, `typescript-eslint`, `eslint-plugin-prettier`, `eslint-config-prettier`, `prettier`, `globals` | Lint + formatação automática, mesmo padrão do lado `react/`. |
| Testes | `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest` | `jest` roda os testes; `supertest` faz requisição HTTP contra a aplicação Nest sem precisar de servidor real de pé - pensado para testes de integração da API; hoje não há nenhum teste de unidade nem e2e no `nest/`, e as regras de negócio são testadas no banco (`informacoes/testes-banco/`). |
| Tipos para bibliotecas JS puras | `@types/bcrypt`, `@types/express`, `@types/node`, `@types/pg` | `bcrypt`/`express`/`node`/`pg` não vêm com tipo TypeScript embutido - esses pacotes só adicionam a definição de tipo, zero código em tempo de execução. |
| Ferramental Nest | `@nestjs/cli`, `@nestjs/schematics`, `@nestjs/testing` | CLI (`nest generate`, `nest build`) e utilitário de teste do próprio framework. |
| Geração de tipo do banco | `kysely-codegen` | Geraria `db.types.ts` automaticamente a partir do schema real do Postgres - **nunca rodou de fato neste projeto** (⚠️ ver seção 16, `db.types.ts` é escrito à mão até hoje). |
| Carregamento de `.env` em script avulso | `dotenv` | Usado fora do ciclo de vida do Nest (que já resolve `.env` via `@nestjs/config`) - em `aplicar-migrations.script.ts`, que roda como script Node solto, sem o `ConfigService` disponível. |

---

## 16. Pontos de atenção consolidados

Reunidos de todas as seções, para servir de checklist.

### Armadilhas do código (podem morder amanhã)

1. 🧩 **`try/catch` em volta de query não desfaz o aborto da transação** - o `COMMIT` vira `ROLLBACK` silencioso e a requisição devolve 200 sem ter gravado nada. Use `SAVEPOINT` via `sql` cru. (§2.4)
2. 🧩 **Nunca `db.transaction()`** - sem savepoint implementado, não faz nada. (§2.4)
3. 🧩 **`SUM` volta string do driver `pg`** - sem `Number()`, a soma vira concatenação. (§8.6)
4. 🧩 **Ordem importa quando a RLS depende do vínculo de posse** - desativar o arquivo antigo **antes** de trocar `id_imagem_perfil`. (§7.4)
5. 🧩 **`.forUpdate()` em refresh** - sem ele, renovações concorrentes duplicam sessão. (§3.3)
6. 🧩 **`.rotate()` antes de descartar EXIF** - sem isso, foto de celular sai deitada para sempre. (§8.5)

### Débitos técnicos

7. ⚠️ **`db.types.ts` é escrito à mão**, com `npm run db:codegen` disponível e nunca rodado. Divergência com o `.sql` só aparece em runtime. (§2.6)
8. ✅ **`perfil-pesquisador.service.create` diferencia as duas `UNIQUE`** pelo mapa central de duplicidade (perfil repetido e CPF repetido têm mensagens próprias). (§5.1)
9. ✅ **`ordem_endosso` é calculada no banco** (trigger `validar_comentario_endosso_autor`, sob lock por campanha, desde 26-09-2026); a corrida teórica acabou. (§7.4)
10. ✅ **`GET /dashboard/resumo` exige login e a permissão `relatorio_visualizar`** (checada dentro de `contar_metricas_dashboard()`, ERRCODE 92011, desde 25-09-2026). (§13)
11. ⚠️ **`notificacoesPendentes` não vai começar a funcionar sozinho** quando `26-notificacao` existir - há precedente comentado no código. (§10)
12. ✅ **`nest/.env.example` existe** (26-09-2026). (§8.8)
13. ⚠️ **`ARQUIVO - Dica de Arquitetura.md` (em `informacoes/arquivo morto/`) cita Cloudflare R2** como provedor; o atual é Supabase Storage. O desenho continua válido, só o nome mudou. (§8.1)
14. ⚠️ **`paginacao.util` com padrão 500** é teto de segurança, não paginação real - precisa baixar quando o primeiro módulo de alto volume existir. (§2.7)
15. ⚠️ **`.stream()` não é suportado** pelo dialect. (§2.4)

### Dependências externas ao código (não resolvem com deploy)

16. ⚠️ **Funções `SECURITY DEFINER` precisam ser criadas pelo SQL Editor do Supabase**, nunca pela `DATABASE_URL` de `app_nestjs` - criar por ali "funciona" sem erro e produz uma função que **não bypassa RLS nenhuma**, porque quem bypassa é o **dono** da função. O erro só aparece na hora de usar. (`PENDENCIAS e correcoes.md`, item 22 - e é a causa raiz dos dois `SAVEPOINT` em `auth.service.login.ts`.)
17. ⚠️ **A regra de ciclo de vida do bucket** (apagar `pendente/` com mais de 24h) é configuração de painel, não código. Se ninguém configurou, os órfãos ficam para sempre. (§8.8)
18. ⚠️ **O bucket precisa estar em domínio separado do site.** (§8.8)
19. ⚠️ **`auditoria_financeira`/`repasse` com escrita `USING (true)`** - o furo aberto no caminho do dinheiro. (§14, item 9)

---

## 17. Como conferir este inventário

Os números da §1.2 e as listas das §13/§14 **envelhecem a cada rodada de trabalho**. Recontar é mais confiável que confiar neles. Rode de dentro de `nest/`:

```bash
# arquivos .ts por módulo (0 = pasta vazia, só .gitkeep)
for d in src/*/; do echo "$(find "$d" -name '*.ts' | wc -l)  $d"; done

# confirmar que uma pasta está mesmo vazia
find src/18-recompensa -type f

# totais
find src -name '*.ts' | wc -l
find src -name '*.module.ts' | wc -l
```

Para reconstruir o inventário de rotas (§13) - controller, método, caminho e presença do guard:

```bash
node -e "
const fs=require('fs'),path=require('path');
function walk(d){let r=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
  if(e.isDirectory())r=r.concat(walk(p));
  else if(e.name.includes('.controller')&&e.name.endsWith('.ts')&&!e.name.endsWith('.spec.ts'))r.push(p);}return r;}
const out=[];
for(const p of walk('src')){const s=fs.readFileSync(p,'utf8');
  const b=s.match(/@Controller\(\s*'([^']*)'/); const base=b?b[1]:'';
  const re=/@(Get|Post|Patch|Put|Delete)\(\s*(?:'([^']*)')?\s*\)/g; let m;
  while((m=re.exec(s))){const l=s.slice(m.index).split('\n');let k=1;while(k<l.length&&/^\s*(@|\/\/)/.test(l[k]))k++;
    const pub=l.slice(0,k).some(x=>/@Publico\(\)/.test(x));
    out.push([(pub?'pub ':'AUTH'), m[1].toUpperCase(), '/'+base+(m[2]?'/'+m[2]:'')]);}}
out.sort((a,b)=>a[2].localeCompare(b[2]));
for(const o of out) console.log(o[0], (o[1]+'      ').slice(0,7), o[2]);
console.log('total de rotas:', out.length);
"
```

📌 **A coluna do guard é detectada por rota:** `pub` quando `@Publico()` está entre os decoradores daquele handler; todo o resto é `AUTH`.

### Documentos irmãos

| Arquivo | Assunto |
|---|---|
| `DOCUMENTACAO_BD.md` | O banco: schema, RLS, triggers, funções - e o log histórico das decisões |
| `DOCUMENTACAO_ERRCODE.md` | Tabela completa código → função → mensagem dos `RAISE EXCEPTION` com ERRCODE customizado |
| `PENDENCIAS e correcoes.md` | Decisões em aberto e o log dos últimos dias; o histórico antigo (itens e partes resolvidos até 22-09-2026) está em `informacoes/HISTORICO/HISTORICO_PENDENCIAS_E_CORRECOES.md`, e os itens 5, 6, 7, 8, 9, 11 e 22 citados neste documento estão lá |
| `PROXIMOS_MODULOS.md` | O que falta construir, em ordem sugerida |
| `ARQUIVO - Dica de Arquitetura.md` (em `informacoes/arquivo morto/`) | O "doc de arquitetura" citado nos comentários de `commons/storage` e `25-arquivo`; a substância está na seção 8 deste documento |
| `nest/.env.example` | Todas as variáveis do `.env` do Nest, com o passo a passo do bucket do Supabase (`STORAGE_*`) |
| `.Tutorial-rodar-projeto.md` | Instalação, incluindo o `ALTER ROLE app_nestjs LOGIN PASSWORD` obrigatório |

---

## 18. Documentação interativa da API (Swagger/OpenAPI)

Adicionado em 04-09-2026. Esta seção é propositalmente mais didática que o resto do documento - escrita pra quem não é programador conseguir entender o que isso é e pra que serve, não só o que mudou no código.

### 18.1 O que é isto, em termos simples

Hoje, pra saber "qual é a URL certa pra criar um usuário, e quais campos ela espera?", a única forma é abrir o código-fonte e ler o controller/DTO, ou perguntar pra quem já sabe. O Swagger (o nome popular; o padrão técnico por trás dele se chama **OpenAPI**) resolve isso gerando uma **página web navegável**, direto a partir do próprio backend, listando toda rota HTTP que existe, o que cada uma espera receber, o que cada uma devolve, e deixando **testar cada uma na hora**, pelo navegador, sem precisar do Thunder Client nem escrever nenhum `curl`.

Pensa nisso como um "manual de instruções" da API que se atualiza sozinho: como ele é **gerado a partir do código de verdade** (não escrito à mão, separado), ele nunca fica desatualizado - se um campo for adicionado a um formulário no backend, a próxima vez que o servidor subir, a documentação já mostra esse campo novo, sem ninguém precisar lembrar de atualizar nada.

### 18.2 Como acessar

Com o backend rodando localmente (`npm run start:dev`, dentro de `nest/`), abra no navegador:

```
http://localhost:3000/api
```

Isso abre a interface visual (Swagger UI) - uma lista de todas as rotas, agrupadas por módulo, cada uma expansível. Clicar numa rota mostra os campos que ela espera (se houver corpo de requisição), os campos que ela devolve, e um botão **"Try it out"** que deixa preencher os campos na tela e disparar a requisição de verdade contra o backend rodando, direto ali.

**Pra testar uma rota que exige login:** clique no botão **"Authorize"** (canto superior direito da página), cole o `accessToken` que `POST /auth/login` devolve (só o valor, sem a palavra "Bearer" na frente - a interface já cuida disso) e confirme. A partir daí, toda rota testada ali carrega esse token junto automaticamente, até você fechar a aba ou clicar em "Logout" no mesmo diálogo.

Também existe uma versão só em JSON, pra ferramenta nenhuma além do navegador consumir (ex.: importar num Postman/Insomnia, ou uma ferramenta que gere um cliente de API automaticamente a partir disso):

```
http://localhost:3000/api-json
```

### 18.3 Por que existe **só fora de produção** - decisão deliberada

Em `main.ts`, o bloco inteiro do Swagger está dentro de um `if (process.env.NODE_ENV !== 'production')`. Ou seja: **num deploy de produção de verdade, `/api` simplesmente não existe** - a rota não é nem registrada.

Mesmo raciocínio já aplicado ao `DevLoginRapido` no React (protegido por `import.meta.env.DEV`, ver §9 do `DOCUMENTACAO_FRONTEND.md`): uma documentação interativa que deixa qualquer um ver TODA a superfície da API (inclusive nomes de rota que ninguém precisa saber existir publicamente) e testar chamada direto pelo navegador é uma ferramenta de desenvolvimento - não algo que deveria ficar exposto, sem senha nenhuma protegendo o `/api` em si, num domínio público depois do deploy. A proteção não muda nada no dia a dia local (`NODE_ENV` normalmente só vira `production` de verdade num ambiente de deploy configurado pra isso).

### 18.4 Como a documentação é gerada sem escrever nada a mão

Existem duas formas de fazer o Swagger funcionar num projeto NestJS:

1. **Decorar cada campo de cada DTO manualmente** (`@ApiProperty({ description: '...', example: '...' })` em cima de cada propriedade de cada classe) - é o que o repositório de referência da disciplina fazia (`swagger.decorators.ts`, achado nos dois projetos de exemplo revisados em 04-09-2026). Funciona, mas exigiria adicionar isso à mão em ~79 DTOs já existentes (48 de request + 31 de response, `§1.2`), e lembrar de repetir isso em todo DTO novo dali pra frente.
2. **Deixar o compilador do NestJS inferir tudo sozinho** - a opção escolhida aqui. Configurado em `nest-cli.json`, no plugin `@nestjs/swagger/plugin`.

**Como a opção 2 funciona, tecnicamente:** o NestJS tem seu próprio compilador (`nest build`/`nest start`, não o `tsc` puro), e esse compilador aceita plugins que reescrevem o código durante a compilação. O plugin do Swagger, com a opção `classValidatorShim: true`, **lê os decorators de validação que já existem** nos DTOs (`@IsEmail()`, `@MinLength(8)`, `@IsOptional()` etc. - a mesma validação da `§6` deste documento) e gera a partir deles a informação que o Swagger precisa (tipo do campo, se é obrigatório, tamanho mínimo...), **sem precisar de nenhum decorator novo**. Testado ao vivo (04-09-2026): o DTO `UsuarioRequestCreate` (`nome`/`email`/`senha`/`idImagemPerfil`, com `@MinLength`/`@IsEmail` de sempre) apareceu no `/api-json` gerado com o schema certo, exatamente como esperado, sem eu ter tocado no arquivo do DTO.

A opção `introspectComments: true`, complementar, faz o plugin usar um comentário JSDoc (`/** como este */`) escrito acima de um campo ou de uma rota como a descrição que aparece no Swagger - pra quem quiser deixar uma rota mais explicada, é só escrever um comentário desse tipo ali, não precisa aprender sintaxe de decorator nenhuma.

### 18.5 ⚠️ A pegadinha de manutenção que fica pra quem criar um DTO novo

Esse "ler sozinho" só funciona pro plugin **conseguir achar o arquivo do DTO em primeiro lugar** - e ele decide se um arquivo é um DTO só pelo **nome do arquivo** (não pelo conteúdo). O padrão de nomenclatura oficial do plugin é terminar em `.dto.ts` - mas este projeto nunca seguiu esse padrão (os arquivos são `usuario.request-create.ts`, `campanha.response.ts` etc., não `usuario-create.dto.ts`).

**Solução aplicada:** o `nest-cli.json` lista, explicitamente, todos os sufixos de nome de arquivo já usados no projeto (`.dto.ts` e mais 24, um por padrão de nome existente, como `.request-create.ts`). Isso foi levantado programaticamente (listando todo arquivo dentro de uma pasta `dto/` e conferindo o padrão do nome), não digitado de memória. **Regerada em 28-09-2026:** a renomeação dos arquivos para ação em inglês deixou a lista velha, e o Swagger parou de mostrar os campos de vários DTOs sem nenhum erro. Uma suíte de teste do banco (a de referências da documentação) agora acusa todo DTO cujo nome não bate com a lista. Depois de mexer no `nest-cli.json`, é preciso reiniciar o `npm run start:dev`: a lista só é lida quando o Nest liga.

**O que isso significa na prática, pra sempre lembrar:** se um dia um módulo novo criar um DTO com um sufixo de nome **que ainda não existe** nessa lista (ex.: um dia surgir `campanha.request-aprovar.ts`, com um sufixo `request-aprovar` que hoje não está na lista), o Swagger **não vai dar erro nenhum** - a rota continua aparecendo normalmente em `/api`, só que o corpo esperado apareceria vazio/genérico, sem os campos de verdade. **Sempre que um DTO novo usar um sufixo de nome que essa lista ainda não tem, é preciso adicionar o sufixo novo em `nest-cli.json` → `compilerOptions.plugins[0].options.dtoFileNameSuffix`.** Fica registrado aqui exatamente por ser o tipo de coisa fácil de esquecer, porque o sintoma (documentação incompleta) não é um erro que trava nada.

### 18.6 O que NÃO foi feito, de propósito

- **Nenhum controller foi tocado.** Os ~94 controllers do projeto continuam exatamente como estavam - a autenticação exigida em cada rota (`document.security = [{ accessToken: [] }]`, aplicado uma vez só no `main.ts`) é um valor padrão de nível de documento inteiro do próprio formato OpenAPI, não uma decoração rota por rota.
- **Nenhum `@ApiProperty`/`@ApiOperation` foi adicionado a nenhum DTO ou controller** - tudo vem do `classValidatorShim`/`introspectComments`, como explicado em `§18.4`. Se um dia uma rota específica merecer uma descrição melhor que a inferida automaticamente, dá pra escrever um comentário JSDoc nela (não precisa decorator) - opcional, não obrigatório.
- **O padrão de decorators do repositório de referência da disciplina (`ApiPostDoc`/`ApiPutDoc`/etc., achado em `Programa-o-para-WEB-2---Completo-main`) não foi adotado.** Ele resolve um problema real (documentar sem repetir 5-6 linhas de decorator por rota), mas exigiria aplicar manualmente em cada um dos ~94 controllers existentes - mais trabalho de retrofit do que a abordagem escolhida, pro mesmo resultado final.

### 18.7 Confirmação de que está funcionando (04-09-2026)

Testado com o backend rodando de verdade contra o Postgres real (não só compilado): `npm run build` limpo (sem aviso do plugin), `/api` devolvendo `200`, `/api-json` com o schema do `UsuarioRequestCreate` batendo exatamente com os decorators de `class-validator` já existentes no arquivo, e `security`/`securitySchemes` do documento confirmando que o cadeado de "exige login" aparece certo em toda rota por padrão.

## 19. Correções da super auditoria (29-09-2026)

**Em palavras simples:** a super auditoria (o relatório dela fica na pasta de informações, fora do repositório) usou o sistema de verdade e achou regras que não funcionavam como o requisito pede. Esta seção registra o que mudou no Nest por causa disso. As regras do banco estão na seção equivalente do `DOCUMENTACAO_BD.md`.

📌 **Bloqueio por senha errada (RF-005) gravado fora da transação.**
- **Decisão:** `auth.service.login.ts` chama `registrar_falha_login()` por uma conexão própria do pool (`PG_POOL`), e não pelo `db` da requisição.
- **Motivo:** o login com senha errada termina em 401. Qualquer exceção faz o `GlobalDbInterceptor` dar `ROLLBACK`, e isso levava junto a anotação da falha. O contador nunca passava de zero, então o bloqueio depois de 5 tentativas nunca acontecia.
- **Caso-limite aceito:** a anotação é gravada mesmo que algo depois dela falhe na mesma requisição. É o comportamento certo para uma trava de segurança.

📌 **Trocar a própria senha exige a senha atual (RF-008).**
- **Decisão:** em `usuario.service.update.ts`, `novaSenha` na própria conta sem `senhaAtual` responde 400, com o erro embaixo do campo (`erroNoCampo`). A senha nova igual à atual também responde 400. Depois da troca, as outras sessões da conta são encerradas: na própria conta fica só a sessão de quem trocou; no reset feito pelo admin caem todas.
- **Motivo:** antes, a ausência de `senhaAtual` era tratada como reset administrativo sem conferir quem pedia. Quem pegasse uma sessão aberta tomava a conta.
- **Caso-limite aceito:** o botão "Redefinir senha dev" do painel continua funcionando para outras contas. Na conta do próprio admin, ele passa a pedir a senha atual.

📌 **E-mail sempre em minúsculas.**
- **Decisão:** a transformação `EmailNormalizado()` (`commons/validacao/transformacoes.decorator.ts`) entra no cadastro, no login e na criação de usuário. O banco normaliza de novo, com a trigger `trg_usuario_normaliza_email`.
- **Motivo:** `ALICE@X.COM` e `alice@x.com` viravam duas contas, e o login com maiúsculas falhava.
- **Caso-limite aceito:** nenhum.

📌 **Alteração sem nenhum campo responde 400, não 500.**
- **Decisão:** campanha, comentário, atualização de campanha, Termo de Uso e link acadêmico conferem "Nenhum campo para atualizar." antes do `UPDATE`, como os outros módulos já faziam. O link acadêmico passou a alterar só o que vier (`url`, `rotulo` e `ordem` opcionais; `rotulo: null` apaga o rótulo).
- **Motivo:** `UPDATE ... SET WHERE` sem coluna é SQL inválido e virava "Internal server error". No link, a URL era obrigatória até para reordenar, e editar o link apagava a ordem dele sem aviso.
- **Caso-limite aceito:** nenhum.

📌 **Ação sobre registro que não existe responde 404.**
- **Decisão:** `exigirQueExista()` (`distinguir-404-ou-403.util.ts`) roda **depois** da função do banco em desbloquear, revogar suspensão (de conta e de papel) e reativar pesquisador. A exclusão de conta confere a mesma coisa pela leitura que já fazia antes.
- **Motivo:** essas funções do banco devolvem VOID e não dizem se acharam a linha, então um id inexistente respondia 204 ("deu certo").
- **Caso-limite aceito:** chamar depois da função mantém o 403 para quem não tem permissão. Por isso, um registro inexistente só vira 404 para quem pode fazer a ação.

📌 **Mensagens de validação em português.**
- **Decisão:** `errosPorCampo()` traduz a mensagem padrão do class-validator quando ela vem em inglês. A mensagem escrita no DTO fica como está. O filtro global traduz a mensagem dos pipes de parâmetro ("Validation failed (numeric string is expected)").
- **Motivo:** a maioria dos formulários respondia "must be a string", "should not be empty" etc.
- **Caso-limite aceito:** a mensagem traduzida usa o nome técnico do campo (`idCampanha precisa ser um número inteiro.`). A tela mostra o erro embaixo do campo certo, então o nome serve de referência.

📌 **`emSequencia` no lugar de `Promise.all`.**
- **Decisão:** a exportação de dados e a exclusão de Termo de Uso usam `emSequencia()` (`commons/database/em-sequencia.util.ts`). A alteração de Termo de Uso faz as duas consultas uma depois da outra.
- **Motivo:** é uma conexão só por requisição (`paginacao.util.ts`). O `Promise.all` nunca rodava em paralelo de verdade e dependia de um enfileiramento que o driver `pg` já avisa que vai remover.
- **Caso-limite aceito:** nenhum.

📌 **Suspensão de papel com motivo (RF-118).**
- **Decisão:** `POST /usuario-papel/:idUsuario/:idPapel/suspender` recebe o mesmo `SuspensaoRequestDto` (data e motivo) da suspensão de conta e de pesquisador. O DTO próprio, que só tinha a data, saiu.
- **Motivo:** o RF-118 pede motivo obrigatório também para a suspensão de um papel.
- **Caso-limite aceito:** nenhum.

📌 **Códigos de resposta.**
- **Decisão:** link de verificação de e-mail inválido responde 400 (era 401). Enviar para aprovação uma campanha que não está em rascunho nem rejeitada responde 409 (era 403).
- **Motivo:** 401 é "não está logado" e faria a tela tentar renovar a sessão. O envio repetido é conflito de estado, o mesmo 409 do aprovar e do rejeitar.
- **Caso-limite aceito:** nenhum.

📌 **Versão nova do Termo de Uso precisa ser aceita (RF-015).**
- **Em palavras simples:** quando o admin publica uma versão nova do Termo de Uso, quem já tem conta só volta a usar a plataforma depois de ler e aceitar.
- **Decisão:** o login e a renovação de sessão perguntam ao banco (`fn_termo_uso_pendente`) se a conta aceitou a versão vigente de `cadastro`. A resposta vai no token (`tp`) e no corpo (`aceitePendente`). Com pendência, o `AuthGuardRequireAuth` responde 403 `TERMO_PENDENTE` em toda rota, menos nas públicas e em `POST /termos-uso/:id/aceitar` (`@LiberadoComTermoPendente()`). Depois do aceite, a tela renova a sessão e o token novo vem sem a pendência.
- **Motivo:** o RF-015 pede o aceite da versão nova. Guardar a resposta no token evita uma consulta ao banco a cada clique.
- **Caso-limite aceito:** quem já está logado quando a versão nova é publicada só é parado na próxima renovação (até 15 minutos). O Termo de upgrade de pesquisador fica de fora: é aceito uma vez, no upgrade. Até o banco ter `fn_termo_uso_pendente`, ninguém fica pendente (a consulta é protegida por SAVEPOINT, como `listarPapeis`).

📌 **Termo aceito não é excluído nem alterado (RF-091).**
- **Decisão:** a exclusão forçada (`forcar`) saiu. `termo-uso.service.remove.ts` e `termo-uso.service.update.ts` não conferem mais o aceite por conta própria: quem recusa é a trigger do banco (409 `91032` e `91033`).
- **Motivo:** o aceite é a prova do que a pessoa aceitou. Apagar a versão apagava junto essa prova (as chaves estrangeiras eram `ON DELETE CASCADE`).
- **Caso-limite aceito:** um rascunho aceito por engano não sai mais da lista. Ele fica inativo, e uma versão nova toma o lugar.

📌 **Renovar a sessão confere se a conta ainda pode entrar.**
- **Decisão:** `auth.service.refresh.ts` recusa a renovação de conta excluída (401 "Sessão encerrada: esta conta não existe mais.") e de conta suspensa (403 com a data e o motivo, a mesma mensagem do login). Suspender e excluir a conta também encerram as sessões dela no banco.
- **Motivo:** a renovação só conferia o refresh token. Uma conta suspensa continuava usando o sistema por até 30 dias (a validade do refresh token), renovando sozinha a cada 15 minutos.
- **Caso-limite aceito:** nenhum.

📌 **O usuário diz se é pesquisador.**
- **Decisão:** `UsuarioResponse` ganhou `ehPesquisador` (`1-usuario/util/usuario.util.is-researcher.ts`), preenchido na consulta e na alteração do usuário.
- **Motivo:** a tela buscava o perfil de pesquisador de toda conta, e a conta comum respondia 404 em toda abertura da Minha Conta.
- **Caso-limite aceito:** nas listagens o campo não vem (fica `undefined`), e a tela trata isso como "não sei" e busca o perfil como antes.

## 20. Correções da auditoria de Nielsen (29-09-2026)

**Em palavras simples:** a auditoria das 10 heurísticas de Nielsen (o relatório fica na pasta de informações, fora do repositório) conferiu se as telas são fáceis de usar. No Nest, o que mudou foram as mensagens de erro que vêm do banco. As telas estão no `DOCUMENTACAO_FRONTEND.md` e as regras do banco no `DOCUMENTACAO_BD.md`.

📌 **Regra do banco violada diz qual é e onde.**
- **Decisão:** `commons/database/mensagens-regra-violada.constants.ts` tem uma mensagem e um campo para cada regra (`CHECK`) que uma tela consegue atingir, no mesmo formato do dicionário de duplicidade. O filtro global usa o nome da regra (`erro.constraint`) para escolher a mensagem e manda `campos`, para o erro aparecer embaixo do campo certo. Campo obrigatório vazio (`23502`) usa a coluna que o Postgres informa. Referência que sumiu (`23503`) passou a dizer o que fazer: recarregar a página.
- **Motivo:** as mensagens eram "Dado inválido para este campo.", "Campo obrigatório ausente." e "Referência inválida". Não diziam qual campo, nem o que fazer. Exemplo real: parâmetro inteiro com "abc".
- **Caso-limite aceito:** as regras internas (sessão, notificação, log, tokens) ficam fora do dicionário. Se uma delas falhar, é defeito do sistema, e a mensagem genérica basta.

📌 **A lista de Termos diz quantos aceites cada versão tem.**
- **Decisão:** `GET /termos-uso` devolve `aceites` em cada versão, pela função `contar_aceites_termo()` do banco. Se a função ainda não existe no banco, a lista sai sem o campo (SAVEPOINT, mesmo jeito de `listarPapeis`).
- **Motivo:** a tela apagava a lixeira só da versão vigente; a versão já aceita só era recusada depois do clique.
- **Caso-limite aceito:** só a listagem traz o número. Criar, alterar, ativar e consultar uma versão não trazem.

📌 **Papel com `codigo` na resposta.**
- **Decisão:** `PapelResponse` ganhou `codigo` (listagem e alteração).
- **Motivo:** a tela acha a descrição de cada papel pelo código, que é fixo. O nome pode ser renomeado pelo painel. O código não é segredo: o login já devolve os papéis da conta por código.
- **Caso-limite aceito:** nenhum.
