# ⚙️ Documentação Técnica do Backend (NestJS) - CrowdAcadêmico

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
10. [Módulos de apoio do painel: `28-log-auditoria`, `29-dashboard`, `5-termo-uso`](#10-módulos-de-apoio-do-painel-28-log-auditoria-29-dashboard-5-termo-uso)
11. [Bootstrap, segurança HTTP e infraestrutura (`main.ts`, `app/`)](#11-bootstrap-segurança-http-e-infraestrutura-maints-app)
12. [Migrations: `aplicar-migrations.script.ts`](#12-migrations-aplicar-migrationsscriptts)
13. [Inventário de rotas HTTP](#13-inventário-de-rotas-http)
14. [O que ainda não existe (pastas vazias)](#14-o-que-ainda-não-existe-pastas-vazias)
15. [Dependências: o que cada uma faz e por que está aqui](#15-dependências-o-que-cada-uma-faz-e-por-que-está-aqui)
16. [Pontos de atenção consolidados](#16-pontos-de-atenção-consolidados)
17. [Como conferir este inventário](#17-como-conferir-este-inventário)

---

## 1. Visão geral: stack, números e mapa de pastas

### 1.1 A stack, e por que cada peça está aí

| Peça | Papel no projeto |
|---|---|
| **NestJS 11** (TypeScript) | Framework HTTP + injeção de dependência. O pipeline dele (guards → interceptors → pipes → handler) é o que torna possível o desenho da seção 2. |
| **Kysely 0.29** | *Query builder* tipado, **não um ORM**. Não há entidades gerenciadas, nem *unit of work*, nem migrations do lado do TypeScript - o schema é escrito à mão em `arquivos_banco_dados/*.sql`, e o Kysely só monta SQL com segurança de tipo em cima dele. |
| **`pg` 8** | Driver Postgres. Usado **diretamente** em três lugares (o `Pool`, o `SET`/`BEGIN`/`COMMIT` do interceptor, e o script de migrations); em todo o resto do app ele fica escondido por baixo do Kysely. |
| **`nestjs-cls`** | `AsyncLocalStorage` embrulhado. Carrega a conexão/transação da requisição atual "por fora", sem nenhum service precisar saber disso. |
| **Supabase** | Só como **host do Postgres** (e, desde então, também do bucket de arquivos - ver seção 8). O Supabase Auth/PostgREST **não** é usado: a autenticação é própria, em `3-auth`. |
| **`@nestjs/jwt` + `bcrypt`** | Access token (JWT) e hash de senha/segredo de refresh token. |
| **`class-validator` / `class-transformer`** | Validação de entrada, via `ValidationPipe` global. |
| **`@nestjs/throttler`** | Rate limit por IP - aplicado em `POST /auth/login` e `POST /auth/cadastro` (ver seção 3). |
| **`helmet`** | Cabeçalhos HTTP de segurança. |
| **`@aws-sdk/client-s3` + `s3-request-presigner`** | Cliente S3 genérico - usado contra o Supabase Storage, não contra a AWS (ver seção 8). |
| **`sharp`** | Processamento de imagem no servidor (redimensiona, converte pra WebP, remove EXIF). |

📌 **Por que Kysely e não TypeORM/Prisma.** O banco deste projeto não é um detalhe de implementação do backend - ele é onde moram as regras de negócio (42 `RAISE EXCEPTION` em triggers, 100+ policies de RLS, funções `SECURITY DEFINER`). Um ORM que gera e migra schema sozinho brigaria com isso o tempo todo. O Kysely resolve o problema real que existe aqui - escrever SQL sem errar nome de coluna - sem tentar ser dono do schema.

### 1.2 Números do código (conferidos, não estimados)

| Item | Quantidade |
|---|---|
| Arquivos `.ts` em `nest/src/` | 355 |
| Módulos Nest (`*.module.ts`) | 22 (19 de domínio + `DatabaseModule` + `StorageModule` + `AppModule`) |
| Arquivos de controller | 94 |
| Arquivos de service | 98 |
| Rotas HTTP (handlers `@Get`/`@Post`/`@Patch`/`@Delete`) | 100 |
| DTOs de request / de response | 48 / 31 |
| Converters | 17 |
| Pastas de módulo **vazias** (só `.gitkeep`) | 10 |

> A seção 17 explica como recontar tudo isso - prefira recontar a confiar nos números acima depois de qualquer rodada de trabalho.

### 1.3 Mapa de pastas

```
nest/src/
├── main.ts                    ← bootstrap: CORS, helmet, trust proxy, ValidationPipe
├── app/                       ← AppModule, GET /, GET /health
├── commons/                   ← infraestrutura compartilhada, sem domínio próprio
│   ├── auth/                  ← formato de request.user (UsuarioAutenticado)
│   ├── database/              ← ⭐ o coração do projeto (seção 2)
│   ├── seguranca/             ← cifra de CPF, validador de CPF, decorator @IsCpf
│   └── storage/               ← abstração de armazenamento de arquivo (seção 8)
├── 1-usuario/ … 29-dashboard/ ← 29 pastas numeradas, uma por domínio
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

📌 **Ordem no pipeline do Nest.** Guards rodam **antes** de interceptors. É por isso que o `JwtAuthGuard` (global, seção 3) consegue resolver `request.user` a tempo de o interceptor encontrá-lo já pronto no passo 3. Essa ordem não é acidente - é o que faz o desenho inteiro fechar.

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

⚠️ **`db.types.ts` é manual, mas não precisava ser.** Existe `npm run db:codegen` (kysely-codegen, já em `devDependencies` e configurado), que introspecciona o Postgres real e gera `db.types.generated.ts` com todas as tabelas. O comentário no topo do arquivo explica que o codegen nunca foi rodado porque o ambiente onde o arquivo foi escrito não tinha um Postgres de pé - e deixa a instrução explícita: **rode o codegen com o banco no ar e, onde divergir, o gerado manda.** Enquanto isso não acontecer, o risco é o de sempre com tipo escrito de cabeça: uma coluna renomeada no `.sql` e não refletida aqui só aparece em runtime.

### 2.7 `paginacao.util.ts` - teto de segurança, não paginação de tela

```ts
const resultado = await paginar(query, { pagina, tamanho });
// → { dados, total, pagina, tamanho }
```

Monte a query normalmente (`select`/`where`/`orderBy`) e troque o `.execute()` final por `paginar(...)`. Ele aplica `LIMIT`/`OFFSET` e roda a contagem.

📌 **`TAMANHO_PAGINA_PADRAO` e `TAMANHO_PAGINA_MAXIMO` são 500, deliberadamente altos.** Hoje isso é um **teto de segurança** ("nenhum `SELECT` sem limite, nunca mais"), não paginação exposta na tela: o `GenericTable` do React continua buscando a lista inteira e paginando no navegador, o que funciona bem para tabelas pequenas. O comentário no arquivo é explícito sobre quando mudar: **quando um módulo de alto volume existir de verdade** (`22-contribuicao`, `26-notificacao`), *esse* módulo escolhe um tamanho pequeno e o React ganha controles de página - não antes, porque não faz sentido construir paginação contra 17 linhas de teste. `28-log-auditoria` já é o primeiro a fazer isso, com `TAMANHO_PADRAO_LOG = 20` próprio.

🧩 **As duas queries de `paginar()` são sequenciais, nunca `Promise.all`.** O comentário registra o achado: o driver `pg` emite *"Calling client.query() when the client is already executing a query is deprecated"*. Como há **uma conexão só por requisição** (é isso que faz o `set_config` da RLS funcionar), as duas queries nunca rodavam em paralelo de verdade - o driver só enfileirava por baixo dos panos, e essa fila implícita é justamente o comportamento que o `pg` vai remover. `await` sequencial custa o mesmo tempo total, sem depender de algo que vai sumir.

`PaginacaoQueryDto` (`commons/database/dto/paginacao.query.dto.ts`) é a base que os DTOs de listagem estendem - `@Type(() => Number)` converte a query string antes do `class-validator` rodar.

Usam `paginar()` hoje: `1-usuario`, `6-perfil-pesquisador`, `8-area-conhecimento`, `9-tipo-link`, `10-motivo-denuncia`, `11-configuracoes`, `12-campanha`, `15-atualizacao-campanha`, `17-comentario`, `28-log-auditoria`.

---

## 3. Autenticação (`3-auth`)

Autenticação própria, JWT com par access + refresh, refresh token com **rotação**. Nada de Supabase Auth.

### 3.1 As duas metades do token

| | Access token | Refresh token |
|---|---|---|
| Formato | JWT assinado (`JWT_SECRET`) | `"<id_sessao>.<segredo>"` - texto puro, não é JWT |
| Validade | `JWT_ACCESS_EXPIRES_IN` (padrão `15m`) | `REFRESH_TOKEN_DIAS_VALIDADE = 30` |
| Onde é validado | `JwtAuthGuard`, em memória - **nunca consultado contra o banco** | `bcrypt.compare` do segredo contra `sessao.refresh_token_hash` |
| Claims | `sub` (id do usuário) e `sid` (id da sessão) | - |

📌 **Por que o refresh token tem o id da sessão colado na frente.** O `id_sessao` serve só para achar a linha rápido (índice de PK). A validade de verdade é **sempre** o `bcrypt.compare` do segredo. O comentário em `auth.constants.ts` é explícito: nunca confiar no `id_sessao` sozinho para revogar ou renovar - ele é sequencial e trivial de adivinhar. É exatamente por isso que `AuthServiceLogout` confere o segredo antes de revogar: sem essa checagem, adivinhar um id derrubaria a sessão de outra pessoa.

📌 **Por que o JWT carrega `sid`.** O access token nunca é comparado contra a tabela `sessao` - então, sem o `sid`, seria impossível saber qual linha de `sessao` corresponde à aba atual. É isso que permite a tela "Sessões ativas" marcar *"esta sessão"* e excluí-la de *"encerrar todas as outras"*. O formato de `request.user` vive em `commons/auth/usuario-autenticado.interface.ts` (e não em `3-auth/`) de propósito: tanto o `JwtAuthGuard` quanto o `GlobalDbInterceptor` precisam dele, e infraestrutura apontando para uma feature ficaria invertido.

### 3.2 Os dois guards

**`JwtAuthGuard`** - global (`APP_GUARD`), roda em toda rota. **Não bloqueia nada por conta própria.** Sem cabeçalho `Authorization`, deixa passar como anônimo (`request.user` fica `undefined`). Com um `Bearer` válido, preenche `request.user = { idUsuario, idSessao }`. Com um token **presente mas inválido/expirado**, lança 401 - porque isso é sempre erro: o cliente pensa que está autenticado e não está, o que é diferente de não mandar token nenhum.

**`RequireAuthGuard`** - aplicado rota a rota com `@UseGuards(RequireAuthGuard)`. Só confere se existe sessão; devolve 401 *"Você precisa estar logado para fazer isso."* se não existir.

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

**Cadastro público** (`POST /auth/cadastro` → `auth.service.cadastro.ts`): reaproveita `UsuarioServiceCreate` (a mesmíssima criação que `POST /usuario` do admin usa) e soma o que só faz sentido no auto-cadastro - grava o aceite do termo **ativo** via `registrar_aceite_termo()` (o id do termo é resolvido pelo servidor, **nunca** aceito do corpo da requisição), gera o token de verificação de e-mail em `verificacao_email`, e já devolve tokens de sessão (quem se cadastra termina logado).

⚠️ **`tokenVerificacaoEmailDev`.** Como `4-mail` não existe, ninguém envia o e-mail. A linha em `verificacao_email` é criada de qualquer jeito, e o token só viaja no corpo da resposta **fora de produção** (`NODE_ENV !== 'production'`). Em produção ele simplesmente não é devolvido - a escolha declarada foi não fingir que um e-mail foi mandado.

**Sessões** (`GET /auth/sessoes`, `DELETE /auth/sessoes`, `DELETE /auth/sessoes/:id`): lista/encerra sessões, usando o `sid` do próprio JWT para marcar qual é a atual.

### 3.4 Rate limit

`ThrottlerModule` é configurado em `auth.module.ts`, mas o `ThrottlerGuard` é aplicado em apenas **duas** rotas: `POST /auth/login` e `POST /auth/cadastro`.

📌 **Por que só nessas duas.** `bcrypt` é lento **de propósito** (~100ms por operação). Sem limite, derrubar o servidor por CPU é barato: basta mandar muitas requisições em paralelo, com senha errada e sem precisar de conta válida. Login é o endpoint público que dispara `bcrypt.compare` sem exigir login antes; cadastro dispara `bcrypt.hash` e, além do custo de CPU, é o tipo de endpoint público que atrai spam/automação sem exigir **nada** antes.

📌 **Isto é ortogonal ao bloqueio por conta.** `configuracoes.limite_tentativas_login` + `registrar_falha_login()` já bloqueiam **uma conta** após N falhas. O throttler protege **o servidor**: um ataque espalhado por várias contas diferentes não aciona o bloqueio do banco, mas aciona este.

📌 **Limite diferente fora de produção:** 5/60s em produção, 30/60s em dev. O motivo está no comentário: o botão `<dev>` "Entrar como" do front dispara um `POST /auth/login` por clique, com 7 contas no dropdown - testar 6 delas em menos de um minuto já esbarrava nos 5/60s e travava, em silêncio, **todos** os logins (o limite é por IP, não por conta).

---

## 4. Autorização: a RLS do Postgres é a única fonte de verdade

**Nenhum guard do NestJS verifica permissão por nome. Nem hardcoded, nem gerada.** Isto é uma decisão consciente, registrada em `PENDENCIAS e correcoes.md`, item 7 - e é **diferente** da sugestão original que estava naquele item (espelhar `tem_permissao()` no lado da aplicação).

### 4.1 A divisão de responsabilidade

| Camada | Responde a pergunta | Onde |
|---|---|---|
| `JwtAuthGuard` | *Quem é você?* | `3-auth/guards/` |
| `RequireAuthGuard` | *Você está logado?* | `3-auth/guards/`, rota a rota |
| **RLS do Postgres** | ***Você pode fazer isto com esta linha?*** | `04_rls_policies.sql` |
| Triggers de `05` | *Esta operação é válida segundo as regras de negócio?* | `05_regras_negocio.sql` |
| Service do Nest | *Como traduzir a recusa acima em HTTP?* | seção 5 |

### 4.2 Por que não duplicar a autorização no Nest

O raciocínio registrado no item 7 tem dois pontos, e o segundo é o mais forte:

1. **Espelhar criaria exatamente a segunda fonte de verdade que se queria evitar.** Mesmo gerando a lista de permissões automaticamente na subida, existiriam **dois** pontos decidindo "pode ou não pode" - o guard *e* a policy - livres para divergir com o tempo.
2. **A RLS quase nunca é só "tem a permissão X".** Ela é quase sempre *"tem a permissão X **OU** é o dono **OU** o status da campanha permite"*. Um guard roda **antes** de saber se a condição extra se aplica - ele não tem a linha em mãos. Reproduzir isso no Nest significaria reimplementar as condições de negócio de 100+ policies em TypeScript.

**O custo aceito:** a negação só é descoberta na hora da query. Mitigado pelo `RequireAuthGuard`, que pega o caso mais comum (nem logado) antes disso.

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

**Faixas de ERRCODE customizado** (as 42 `RAISE EXCEPTION` de `05_regras_negocio.sql` - tabela completa em `DOCUMENTACAO_ERRCODE.md`), reconhecidas pelo **prefixo de 2 dígitos**:

| Prefixo | Categoria | HTTP |
|---|---|---|
| `90xxx` | Validação de dado/negócio | `400 Bad Request` |
| `91xxx` | Conflito de estado | `409 Conflict` |
| `92xxx` | Autorização negada por regra de negócio (não RLS) | `403 Forbidden` |
| `93xxx` | Limite de taxa | `429 Too Many Requests` |

**SQLSTATE nativos do Postgres:**

| Código | Significado | HTTP | Mensagem |
|---|---|---|---|
| `23505` | unique_violation | 409 | "Já existe um registro com estes dados." |
| `23503` | foreign_key_violation | 400 | "Referência inválida: o registro relacionado não existe." |
| `23502` | not_null_violation | 400 | "Campo obrigatório ausente." |
| `23514` | check_violation | 400 | "Dado inválido para este campo." |
| `42501` | **RLS violation** | **403** | "Sem permissão para esta operação." |
| `P0001` | `RAISE EXCEPTION` sem ERRCODE | 400 | mensagem original da função |

📌 **A mensagem das faixas `90`-`93` é a mensagem original da função do banco**, repassada literalmente. Isso vale a pena porque essas mensagens foram escritas para o usuário final ("Duração da campanha fora do intervalo configurado"), não para o desenvolvedor.

📌 **`P0001` vira 400, e o comentário justifica:** sem ERRCODE customizado não dá para saber se é permissão, validação ou conflito - 400 com a mensagem original é o mais honesto possível. Sobram nessa situação as funções fora de `05` que ainda não ganharam ERRCODE próprio (ex.: `excluir_conta_usuario()`, em `03_funcoes_seguranca.sql`).

### 5.2 Quando tratar localmente em vez de deixar cair no filtro

O filtro nasceu como rede de segurança: `usuario.service.create` não tinha `try/catch` nenhum, e e-mail duplicado virava 500 cru em vez de 409.

Mas onde o service consegue dar uma mensagem **melhor** que a genérica, ele trata. `configuracao.service.create.ts` é o exemplo canônico:

```ts
if (codigo === '23505') throw new ConflictException(`Já existe uma configuração com a chave "${dto.chave}".`);
if (codigo === '42501') throw new ForbiddenException(
  dto.global ? "Sem permissão 'configuracao_gerenciar' para criar configuração global."
             : 'Sem permissão para criar esta configuração.');
```

⚠️ **Onde ainda não dá para diferenciar.** `perfil-pesquisador.service.create.ts` tem **duas** constraints `UNIQUE` que disparam `23505` (a PK `id_usuario`, se a pessoa já tem perfil; e `UK_PERFIL_PESQUISADOR_CPF_HASH`, se o CPF já pertence a outra conta) - mas o service não as diferencia. O comentário registra o porquê: distinguir por nome de constraint exige confirmar o formato exato do erro do driver `pg` contra um Postgres real, o que não estava disponível quando o módulo foi escrito. O resultado é um 409 genérico onde caberia uma mensagem específica.

⚠️ **`try/catch` em volta de query continua sendo armadilha.** Ver §2.4 - tratar localmente **não** desfaz o aborto da transação. Os exemplos acima são seguros porque relançam sempre (o erro sobe, o interceptor faz `ROLLBACK`, a requisição termina); o perigo é *engolir* e seguir usando o mesmo `db`.

---

## 6. Validação e DTOs (`class-validator` + converters)

### 6.1 O `ValidationPipe` global

Em `main.ts`:

```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
```

- **`whitelist`** - descarta campo que não está no DTO.
- **`forbidNonWhitelisted`** - rejeita a requisição inteira se vier campo a mais, em vez de só ignorar. 📌 O comentário explica a escolha: ignorar em silêncio esconderia erro de digitação no corpo da requisição.
- **`transform`** - converte o corpo para instância real da classe do DTO (sem isso, os decorators não validam nada útil), e é o que faz `@Type(() => Number)` funcionar em query string.

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
├── entity/<nome>.entity.ts               ← type alias sobre db.types.ts
└── util/                                 ← só onde faz sentido (ex.: 25-arquivo)
```

📌 **A regra mais visível do projeto: um arquivo por ação.** Não existe `UsuarioService` com 8 métodos - existem `UsuarioServiceCreate`, `UsuarioServiceUpdate`, `UsuarioServiceRemove`, `UsuarioServiceSuspender`, `UsuarioServiceDesbloquear`, `UsuarioServiceListarLogins`, `UsuarioServiceFindAll` e `UsuarioServiceFindOne`, cada um num arquivo, cada um com um único método público `executar()`. O mesmo vale para controllers.

📌 **O que isso compra.** Duas pessoas mexendo em ações diferentes do mesmo módulo nunca colidem no mesmo arquivo (relevante para um TCC em dupla). Cada arquivo carrega os comentários da *sua* regra, sem virar um arquivo de 600 linhas com contexto de oito assuntos misturados. E a lista de arquivos numa pasta já é a lista de capacidades do módulo.

📌 **O que isso custa.** Muito arquivo (94 controllers, 98 services) e um `@Module` com listas longas de `controllers`/`providers`. O custo é aceito conscientemente.

**Entity** é sempre um alias, não uma classe escrita à mão:

```ts
export type UsuarioEntity = Selectable<UsuarioTable>;
```
O comentário registra a mudança: era uma classe espelhando a tabela; agora a fonte da verdade é `db.types.ts`, e o alias existe só para não precisar tocar em converter/DTO.

### 7.2 Anatomia de um controller

Controllers são **finos** - sem lógica, sem checagem:

```ts
@Controller('arquivo/upload')
export class ArquivoControllerIniciarUpload {
  constructor(private readonly service: ArquivoServiceIniciarUpload) {}

  @Post('iniciar')
  @UseGuards(RequireAuthGuard)
  iniciar(@Body() dto: ArquivoRequestIniciarUpload, @Req() request: Request) {
    return this.service.executar(dto, request.user!.idUsuario);
  }
}
```

Três coisas para notar:
- **`request.user!.idUsuario` extraído no controller e passado como parâmetro** ao service. Nenhum service lê `request` - ele recebe o id. Isso mantém os services testáveis e livres de HTTP.
- **O `!` é seguro aqui**, e só aqui: o `RequireAuthGuard` na mesma rota garante que `request.user` existe.
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

**`ComentarioServiceCreate`** - cálculo que a trigger não faz. A trigger `validar_comentario_endosso` valida a **contagem** contra o limite configurado, mas não **calcula** o próximo `ordem_endosso`; o service faz `MAX(ordem_endosso)+1`. ⚠️ Corrida teórica assumida (duas pessoas endossando ao mesmo tempo podem calcular o mesmo número), aceita pelo volume baixo - registrado tanto no comentário quanto em `PENDENCIAS e correcoes.md`, item 747. A solução, se virar problema real, é mover o cálculo para uma trigger `BEFORE INSERT`.

**`CampanhaServiceFindAll`** - filtros que **não** são autorização:
> *"`pol_campanha_select` já decide QUAIS linhas aparecem (status público, ou dono, ou `relatorio_visualizar`) - os filtros abaixo são só conveniência de navegação por cima do que a RLS já deixou visível, nunca uma segunda camada de autorização."*

Também registra uma mudança concreta: era `orderBy('criado_em','desc')`, virou `orderBy('id_campanha')` a pedido do Lucas, porque `criado_em` do seed nem sempre bate com a ordem de inserção real (algumas linhas foram seedadas com timestamp retroativo).

### 7.5 Exportação entre módulos

Módulos exportam services quando outro precisa reaproveitar a regra em vez de duplicá-la. Os casos reais:

| Módulo | Exporta | Para quem, e por quê |
|---|---|---|
| `1-usuario` | `UsuarioServiceFindOne` | `3-auth` devolve o usuário público no corpo do login sem duplicar query/converter |
| `1-usuario` | `UsuarioServiceCreate` | `POST /auth/cadastro` reaproveita a mesma criação de `POST /usuario` (hash + INSERT + `atribuir_papel_padrao()`) |
| `25-arquivo` | `ArquivoServiceRemove` | `UsuarioServiceUpdate` limpa a foto anterior na troca |
| `25-arquivo` | `ArquivoServiceResolverAvatar` | resolve a URL do avatar com o mesmo fallback em qualquer lugar |
| `5-termo-uso` | `TermoUsoServiceAtivo` | o cadastro grava o aceite do termo **ativo**, resolvido pelo servidor |

📌 **Ciclo de importação é evitado com direção única.** `1-usuario` importa `25-arquivo`; `25-arquivo` não importa `1-usuario` de volta (o comentário no `usuario.module.ts` diz isso explicitamente). `DatabaseModule` e `StorageModule` são `@Global()` - ninguém precisa importá-los, o que corta a maior fonte de ciclos.

---

## 8. Armazenamento e upload de arquivo (`commons/storage` + `25-arquivo`)

> ⚠️ **Este módulo foi alterado em 01-09-2026** (processamento com `sharp`, cota por usuário, novos tetos de tamanho). O que segue descreve o estado **atual**. Vários números aqui são recentes; confira as constantes no código antes de citá-los em outro lugar.

### 8.1 A premissa que simplifica tudo: nenhum arquivo é secreto

Foto de perfil, imagem de campanha, anexo de atualização - tudo é conteúdo público, feito para aparecer numa página que qualquer visitante anônimo abre. **Não existe no sistema um único arquivo que precise de controle de acesso na hora do download** (o dado realmente sensível, o CPF, é coluna de banco, não arquivo).

📌 **Consequência.** O bucket pode ser público e servido por um domínio próprio; o navegador busca a imagem direto de lá, sem passar pelo Nest e sem link assinado por leitura. `arquivo.chave` guarda o caminho do objeto, e `montarUrlPublica()` monta o endereço - string pura, zero rede. Metade da complexidade de um módulo de upload costuma ser controle de acesso ao download; aqui ela não existe. (Raciocínio completo em `ARQUIVO - Dica de Arquitetura.md`, o "doc de arquitetura" citado nos comentários do código.)

⚠️ **`ARQUIVO - Dica de Arquitetura.md` fala em Cloudflare R2** - ele foi escrito quando o R2 era o provedor cogitado. O **provedor atual é o Supabase Storage** (ver 8.2). O desenho descrito lá continua valendo integralmente; só o nome do provedor mudou.

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

**Provedor atual: Supabase Storage** (bucket S3-compatível, no mesmo projeto Supabase que hospeda o Postgres). Confirmado em três lugares: `nest/.env` (`STORAGE_ENDPOINT` aponta para `…storage.supabase.co/storage/v1/s3`), `ARQUIVO_para_configurar_modulo-arquivo.md` (instruções de criação do bucket no painel do Supabase) e o comentário no topo do service.

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

`25-arquivo/util/arquivo.assinatura.util.ts`.

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

`25-arquivo/util/arquivo.processamento-imagem.util.ts`. Roda em `confirmar-upload`, **depois** de a assinatura já ter sido conferida - nunca processar bytes que ainda não foram validados como o tipo que afirmam ser.

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

### 8.6 Tetos de tamanho e cota por usuário

**Tetos por MIME** (`TAMANHO_MAXIMO_BYTES_POR_MIME`):

| Tipo | Teto |
|---|---|
| `image/jpeg`, `image/png`, `image/webp` | **8 MB** |
| `application/pdf` | **5 MB** |

📌 **Baixados de 10MB/20MB (01-09-2026).** O motivo está no comentário: o projeto roda no plano grátis do Supabase Storage, com **1 GB de espaço total** e **50 MB de teto por arquivo individual** no próprio plano. Um teto de 20MB por PDF deixava um único upload malicioso ocupar 2% da cota inteira. A imagem cai menos porque 8MB é folga de sobra para foto de celular sem tratar, e o processamento reduz o que sobra para uma fração disso. Números do plano gratuito conferidos direto na documentação oficial do Supabase (01-09-2026, não estimados): [Limits | Supabase Docs](https://supabase.com/docs/guides/storage/uploads/file-limits) e [Pricing | Supabase Docs](https://supabase.com/docs/guides/storage/pricing) - vale reconferir se algum dia a conta de "quantos arquivos cabem" precisar ser refeita, porque plano gratuito de provedor terceiro é o tipo de número que muda sem aviso.

**`TAMANHO_MAXIMO_BYTES_ABSOLUTO`** é o maior dos quatro, usado só como `@Max()` no DTO - validação de **forma**, para rejeitar valores absurdos (`999999999999`) antes de qualquer lógica de negócio. O teto de verdade, por tipo, é conferido no service.

**Cota: `COTA_BYTES_POR_USUARIO = 50 MB`**, somada contra `SUM(arquivo.tamanho_bytes)` onde `id_usuario_upload = <usuário>` e `ativo = true`.

📌 **Por que uma cota, além dos tetos por arquivo.** Nenhum teto por arquivo protege contra alguém subindo mil arquivos pequenos. Numa base de 1GB total, isso deixa de ser preciosismo: 20 contas maliciosas com 50MB cada tomam a cota inteira.

📌 **A cota é checada em DOIS pontos, com propósitos diferentes:**

| Onde | Como | Por quê |
|---|---|---|
| `iniciar-upload` | `bytesJaUsados >= COTA` (sem somar o novo arquivo) | Checagem **barata**, antes de gastar uma URL pré-assinada. Só evita o desperdício óbvio: quem já estourou a cota nem recebe URL. |
| `confirmar-upload` | `bytesJaUsados + tamanhoFinal > COTA` | A checagem **de verdade**, com o tamanho real pós-processamento. |

🧩 **O posicionamento exato da segunda checagem é deliberado: depois de processar, antes de gravar em `publico/`.** O comentário explica os dois erros que isso evita - checar **antes** do processamento seria injusto (rejeitaria um upload que cabe de sobra depois de comprimido); checar **depois** de já ter gravado em `publico/` deixaria arquivo órfão para trás quando estourasse. Estourou → o objeto pendente é apagado e vem 400.

🧩 **`Number()` obrigatório no resultado do `SUM`.** `SUM` de coluna `integer` volta `bigint` do Postgres, e o driver `pg` devolve `bigint` como **string** (para evitar perda de precisão silenciosa). Sem o `Number()`, `usoAtual + tamanhoFinal` **concatenaria texto** em vez de somar.

### 8.7 Remoção e avatar

**`ArquivoServiceRemove`** - *soft delete* no banco (`ativo = false`, `desativado_em`), nunca `DELETE` de linha: `06_grants.sql` só concede `INSERT`/`UPDATE` em `arquivo` (sem `DELETE`), e faz sentido - um arquivo referenciado por `arquivo_atualizacao`, `arquivo_recompensa` ou `usuario.id_imagem_perfil` não pode sumir do banco sem quebrar FK.

📌 **Mas os bytes no bucket são apagados de verdade.** O comentário explica por que isso é seguro: ninguém serve o arquivo pela chave sem antes passar pela checagem de `ativo` no banco; uma vez `ativo = false`, o dado já parou de aparecer em qualquer lugar do sistema. Falha ao apagar do bucket **não** desfaz o soft delete (a linha já ficou inativa, que é o que importa para a correção do sistema) - só vira um objeto órfão, e agora **com `logger.warn`**, não em silêncio.

**`ArquivoServiceResolverAvatar`** - a cadeia de fallback, em um lugar só:
1. `id_imagem_perfil` aponta para um arquivo `ativo` → URL pública dele, `padrao: false`.
2. Aponta para um arquivo removido/desativado → cai no fallback (em vez de devolver link quebrado).
3. Fallback: a chave em `configuracoes.avatar_padrao_chave` (editável pelo painel Admin, sem deploy) → URL, `padrao: true`.
4. Config vazia → `{ url: null, padrao: true }`, e o front usa o próprio placeholder local.

📌 **`GET /arquivo/avatar/:idUsuario` é pública de propósito** (sem `RequireAuthGuard`): um visitante anônimo olhando um perfil ou os comentários de uma campanha precisa ver o avatar.

📌 **`UsuarioServiceUpdate` devolve `avatarUrl` já resolvida** na resposta do `PATCH`, para que o front só repasse o objeto e o cabeçalho reflita a troca na hora, sem recalcular nada.

### 8.8 Lembretes de infraestrutura (configurados no painel, não em código)

De `ARQUIVO_para_configurar_modulo-arquivo.md`:
1. O bucket precisa ser **público** (leitura) e servido por um **domínio separado** do site principal (`arquivos.<dominio>`, nunca `<dominio>/arquivos`) - assim, mesmo que algo malicioso escape, não roda "de dentro" do site nem alcança cookies/sessão.
2. **Regra de ciclo de vida** apagando tudo em `pendente/` com mais de 24h.
3. A lista de tipos aceitos é fechada no código; SVG nunca entra.

⚠️ **Não existe `nest/.env.example`.** O código referencia esse arquivo em mensagem de erro (*"Ver .env.example"*), e `ARQUIVO_para_configurar_modulo-arquivo.md` cumpre esse papel na prática para as `STORAGE_*` - mas o arquivo em si não está no repositório.

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

## 10. Módulos de apoio do painel: `28-log-auditoria`, `29-dashboard`, `5-termo-uso`

Módulos pequenos, mas reais e em uso pelo painel administrativo.

### `28-log-auditoria` (8 arquivos, 2 endpoints)

Somente leitura - a escrita em `log_auditoria` é feita por trigger genérica no banco (letra `L` do `DOCUMENTACAO_BD.md`), nunca pelo Nest.

- **`GET /log-auditoria?tabela=<x>`** - histórico de **uma** tabela, para o botão "Ver log" no fundo de cada listagem. Faz `leftJoin` com `usuario` para trazer `nome_responsavel` junto. Usa `paginar()` com `TAMANHO_PADRAO_LOG = 20` próprio. 📌 O comentário explica por que 20 e não o teto de 500: *aqui não é um teto "para nunca baixar tudo por acidente", é o tamanho de verdade do painel* - mostrar as últimas 20 alterações é o caso de uso real.
- **`GET /log-auditoria/minha-atividade`** - últimas 10 ações do **próprio** usuário, de **qualquer** tabela, para o sino "Atividade recente" do cabeçalho. Não recebe `tabela`; é *"o que EU fiz"*, não *"o histórico de uma tabela"*.

📌 **A autorização é 100% RLS, como sempre.** `pol_log_auditoria_select` exige `tem_permissao('log_visualizar')`; sem ela a query volta **vazia**, não dá erro. O comentário registra a dependência: a policy foi ampliada para deixar qualquer usuário ver as próprias linhas - sem essa mudança aplicada no banco, `minha-atividade` volta vazia para quem não é admin, mesmo sendo autor das próprias linhas.

### `29-dashboard` (4 arquivos, 1 endpoint)

**`GET /dashboard/resumo`** - uma única chamada a `SELECT * FROM contar_metricas_dashboard()` (bloco `[03-M]`).

📌 **Por que uma função `SECURITY DEFINER` em vez de contar no Nest.** A função bypassa deliberadamente a RLS restritiva de `usuario`/`configuracoes`. Sem isso, o total mostrado **dependeria de quem está logado** - errado para um card que diz "total do sistema".

Devolve `totalUsuarios`, `totalPesquisadores`, `totalPapeis`, `totalPermissoes`, `totalConfiguracoes`, `totalCampanhas`, `sessoesAtivas` e `notificacoesPendentes`.

⚠️ **`notificacoesPendentes` é `null` fixo** - `26-notificacao` não existe. Há um precedente comentado no código: `totalCampanhas` **também** era `null` fixo ("campanha ainda não existe") e continuou `null` mesmo depois de `12-campanha` ser construído, até alguém perceber e atualizar a função do banco. **Quando `26-notificacao` existir, este campo não vai começar a funcionar sozinho** - exige atualizar `contar_metricas_dashboard()` no `.sql` *e* trocar o `null` aqui.

### `5-termo-uso` (4 arquivos, 1 endpoint)

**`GET /termos-uso/ativo`** - devolve a versão vigente dos termos. Pequeno, mas estruturalmente importante: `AuthServiceCadastro` injeta `TermoUsoServiceAtivo` para gravar o aceite do termo **ativo resolvido pelo servidor**, nunca um id vindo do cliente.

---

## 11. Bootstrap, segurança HTTP e infraestrutura (`main.ts`, `app/`)

`main.ts` faz quatro coisas, todas com motivo registrado em comentário:

1. **`app.enableCors()`** - o front (Vite, outra origem) não chamaria a API sem isso.
2. **`set('trust proxy', 1)`** - 📌 sem isso, **em produção atrás de qualquer proxy reverso**, o Express enxerga o IP do **proxy** em toda requisição. Dois efeitos ruins, invisíveis em localhost (onde não há proxy, então nunca aparecem em teste): (a) o `ThrottlerGuard` passaria a contar **todo mundo como o mesmo IP** - o limite de 5/60s viraria global, e uma pessoa tentando logar travaria o login de todos; (b) `sessao.ip` e `usuario.ultimo_login_ip` gravariam sempre o IP do proxy, deixando a auditoria de login inútil. O valor `1` confia só no primeiro salto; aumentar só se o deploy tiver proxies encadeados.
3. **`app.use(helmet())`** - acrescenta cabeçalhos de segurança que o Express não manda sozinho (HSTS, `X-Content-Type-Options`, `X-Frame-Options`, CSP básico). Sem configuração, porque os padrões já cobrem o caso de uso (API pura, sem servir HTML).
4. **`useGlobalPipes(new ValidationPipe(...))`** - ver §6.1.

O `bootstrap().catch()` no fim imprime a falha e chama `process.exit(1)` - 📌 é ali que o health-check de `DatabaseModule.onModuleInit()` (conectar como `app_nestjs`) aparece se falhar.

**`GET /health`** (`app/health.controller.ts`) - roda `SELECT 1` no `Pool`. Sem login. 📌 Usa **`@Inject(PG_POOL)` direto**, não `DatabaseService.getDb()`, e o comentário justifica: um health check tem que testar a **fundação** (o Pool abre conexão e roda query?), não passar pela maquinaria de transação por requisição, que é sobre RLS/auditoria de quem fez o quê - irrelevante aqui, ninguém "fez" nada. 📌 Devolve **503**, não 500, quando o banco está fora: a aplicação está de pé, é a **dependência** que caiu - e é essa distinção que a plataforma de deploy usa para decidir entre reiniciar o processo (500, bug de código) ou só esperar (503, o banco volta sozinho).

**`GET /`** (`app/app.controller.ts`) - o "hello world" do scaffold do Nest, nunca removido.

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

---

## 13. Inventário de rotas HTTP

100 handlers. `AUTH` = a rota tem `@UseGuards(RequireAuthGuard)`; `pub` = sem ele (o que **não** significa "sem proteção" - significa que quem protege é a RLS, e que anônimo é um caso legítimo).

| | Método | Rota |
|---|---|---|
| pub | GET | `/` |
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
| pub | POST · GET | `/usuario` |
| pub | GET | `/usuario/:id` |
| AUTH | PATCH · DELETE | `/usuario/:id` |
| pub | GET | `/usuario/:id/logins` |
| AUTH | GET | `/usuario/:id/suspensao` |
| AUTH | POST | `/usuario/:id/suspender` · `/usuario/:id/revogar-suspensao` · `/usuario/:id/desbloquear` |
| pub | GET | `/papel` · `/permissao` · `/papel-permissao` |
| AUTH | PATCH | `/papel/:id` |
| AUTH | POST | `/papel-permissao` |
| AUTH | DELETE | `/papel-permissao/:idPapel/:idPermissao` |
| pub | GET | `/usuario-papel` · `/usuario-papel/:idUsuario` |
| AUTH | POST | `/usuario-papel` |
| AUTH | DELETE | `/usuario-papel/:idUsuario/:idPapel` |
| AUTH | POST | `/usuario-papel/:idUsuario/:idPapel/suspender` · `.../revogar-suspensao` |
| **Perfil e links** | | |
| pub | GET | `/perfil-pesquisador` · `/perfil-pesquisador/:id` · `/perfil-pesquisador/:id/score` |
| AUTH | POST · PATCH | `/perfil-pesquisador` |
| pub | GET | `/link-academico` |
| AUTH | POST | `/link-academico` |
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
| **Campanha e satélites** | | |
| pub | GET | `/campanha` · `/campanha/:id` |
| AUTH | POST | `/campanha` |
| AUTH | PATCH · DELETE | `/campanha/:id` |
| AUTH | POST | `/campanha/:id/aprovar` · `/campanha/:id/rejeitar` |
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
| pub | GET | `/dashboard/resumo` |

📌 **Rotas administrativas sem `RequireAuthGuard` são uma escolha declarada, não esquecimento.** O comentário em `usuario-papel.controller.findall-geral.ts` é o mais explícito e vale por todos: *"SEM RequireAuthGuard, DE PROPÓSITO - este painel admin, em qualquer versão futura do sistema, só é alcançado por admin. Não é gambiarra: mesmo padrão já usado por `PapelControllerFindAll` e `UsuarioControllerFindAll`, ambos também sem guard, apoiados na RLS."* `GET /usuario/:id/logins` remete a esse mesmo raciocínio. A defesa continua sendo a policy (`id_usuario_atual()` é `NULL` para anônimo, e a policy decide o que fazer com isso), não o guard.

⚠️ **Mas há um caso que foge dessa lógica: `GET /dashboard/resumo`.** Ele é público **e** chama uma função `SECURITY DEFINER` que **bypassa a RLS de propósito** (é o que torna o total confiável, §10) - ou seja, aqui a policy não é rede de proteção nenhuma. Os totais do sistema (número de usuários, campanhas, sessões ativas) ficam acessíveis sem login. Não expõe dado de ninguém em particular, mas é o único ponto do backend onde "público" e "bypassa RLS" se encontram na mesma rota.

---

## 14. O que ainda não existe (pastas vazias)

Conferido: as 10 pastas abaixo contêm **exatamente um arquivo `.gitkeep`** e **zero `.ts`**.

| Pasta | Grupo em `PROXIMOS_MODULOS.md` |
|---|---|
| `4-mail` | Comunicação |
| `18-recompensa` | Engajamento |
| `19-denuncia` | Moderação |
| `20-solicitacao-encerramento` | Moderação |
| `21-historico-rejeicao` | Moderação |
| `22-contribuicao` | Pagamento |
| `23-repasse` | Pagamento |
| `24-auditoria-financeira` | Pagamento |
| `26-notificacao` | Comunicação |
| `27-resources` | Propósito ainda não definido |

📌 **Este documento descreve o que EXISTE.** O que falta, a ordem sugerida e o porquê de cada adiamento estão em **`PROXIMOS_MODULOS.md`**, que é o dono desse assunto e está atualizado. Não duplicar aqui.

Três consequências do que falta são visíveis dentro do código já escrito, e valem registro:

- **`4-mail` bloqueia dois fluxos prontos no banco.** Verificação de e-mail e recuperação de senha têm tabela, índice e função - e o cadastro **já grava** a linha em `verificacao_email`. Só ninguém envia o e-mail. (`PENDENCIAS e correcoes.md`, item 6.)
- **`26-notificacao` mantém `notificacoesPendentes: null`** no dashboard (§10).
- **`22-contribuicao`/`23-repasse`/`24-auditoria-financeira`** são o Grupo 8, por último de propósito - a decisão de gateway de pagamento ainda não foi tomada. ⚠️ E é justamente aí que mora a pendência de segurança mais séria em aberto: **`auditoria_financeira` e `repasse` têm policies de escrita `USING (true)` - a RLS não valida quem grava.** Num sistema onde a RLS é a única camada de autorização, essas duas tabelas são o buraco no desenho. A defesa proposta (item 9 de `PENDENCIAS e correcoes.md`) é isolar a escrita num único service interno do Nest, chamado só pelo webhook do gateway, **nunca exposto como endpoint CRUD genérico** - quem construir esses módulos precisa ler aquele item antes de começar.

---

## 15. Dependências: o que cada uma faz e por que está aqui

A tabela da seção 1.1 já dá o resumo de uma linha por peça. Este capítulo aprofunda o **porquê** - a alternativa que foi preterida e o motivo, sempre que isso está determinável pelo que o código realmente faz (não é uma lista de "achismo de mercado", é o papel real que cada pacote cumpre neste projeto específico).

### 15.1 Núcleo do framework - exigido pelo NestJS, não é escolha do projeto

`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `reflect-metadata`, `rxjs`. Essas cinco não representam uma decisão de arquitetura - são o próprio NestJS. `@nestjs/platform-express` escolhe **Express** como servidor HTTP por baixo (a alternativa seria `@nestjs/platform-fastify`); nada neste projeto depende de recurso exclusivo de Express, então a escolha é a opção padrão/mais documentada, não uma necessidade técnica específica. `reflect-metadata` existe porque o Nest usa decorators (`@Controller`, `@Injectable`, `@Body`) para descrever metadado de tipo em tempo de execução - sem ele, a injeção de dependência do framework simplesmente não funciona. `rxjs` é a base dos `Observable` que interceptors/pipes do Nest usam internamente; o código deste projeto quase não usa RxJS diretamente (não há stream de evento nem programação reativa de propósito aqui), é consumido pela infraestrutura do framework.

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

### 15.8 Armazenamento de arquivo - `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` + `sharp`

Os dois pacotes da AWS **não implicam usar a AWS** - são o cliente do protocolo S3, que o Supabase Storage (provedor atual, seção 8.2), Cloudflare R2, Backblaze B2 e MinIO também falam. A escolha de usar o SDK oficial da AWS em vez de escrever chamada HTTP crua contra a API S3 é puro pragmatismo: é o cliente mais maduro/testado do protocolo, mesmo apontado para um provedor que não é a AWS. `s3-request-presigner` é o que gera a URL pré-assinada de upload (seção 8.3) - sem ele, o Nest precisaria proxiar o binário do arquivo inteiro através de si mesmo, exatamente o risco que o desenho em 2 passos evita (processo Node ocupado segurando upload grande). `sharp` é o processamento de imagem no servidor (seção 8, redimensionar + converter pra WebP + remover EXIF) - rápido porque roda sobre `libvips` (biblioteca C nativa), não JavaScript puro; o preço dessa velocidade é distribuir binário pré-compilado por sistema operacional, por isso o `node_modules` nunca pode ser commitado nem copiado entre máquinas (precisa rodar `npm install` no próprio ambiente de destino).

### 15.9 Dependências de desenvolvimento (resumo, sem aprofundar cada uma)

Nenhuma delas roda em produção - ficam de fora do processo que o Render executa. Agrupadas por função, não por ordem alfabética:

| Grupo | Pacotes | Papel |
|---|---|---|
| Linguagem/compilação | `typescript`, `ts-node`, `ts-loader`, `tsconfig-paths`, `source-map-support` | Compila/roda TypeScript; `source-map-support` faz stack trace de erro apontar pra linha do `.ts` original, não pro `.js` gerado. |
| Qualidade de código | `eslint`, `@eslint/js`, `@eslint/eslintrc`, `typescript-eslint`, `eslint-plugin-prettier`, `eslint-config-prettier`, `prettier`, `globals` | Lint + formatação automática, mesmo padrão do lado `react/`. |
| Testes | `jest`, `ts-jest`, `@types/jest`, `supertest`, `@types/supertest` | `jest` roda os testes; `supertest` faz requisição HTTP contra a aplicação Nest sem precisar de servidor real de pé - usado (ou planejado) para os testes de integração de `test/app.e2e-spec.ts`. |
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
8. ⚠️ **`perfil-pesquisador.service.create` não diferencia as duas `UNIQUE`** que disparam `23505` - 409 genérico onde caberia mensagem específica. (§5.2)
9. ⚠️ **`ComentarioServiceCreate` calcula `ordem_endosso` no Nest**, com corrida teórica aceita. (§7.4, e item 747)
10. ⚠️ **`GET /dashboard/resumo` é público E bypassa a RLS** (`SECURITY DEFINER`) - o único ponto do backend onde as duas coisas coincidem, deixando os totais do sistema acessíveis sem login. As outras rotas admin sem guard são escolha declarada e continuam protegidas pela policy. (§13)
11. ⚠️ **`notificacoesPendentes` não vai começar a funcionar sozinho** quando `26-notificacao` existir - há precedente comentado no código. (§10)
12. ⚠️ **Não existe `nest/.env.example`**, apesar de o código referenciá-lo em mensagem de erro. (§8.8)
13. ⚠️ **`ARQUIVO - Dica de Arquitetura.md` cita Cloudflare R2** como provedor; o atual é Supabase Storage. O desenho continua válido, só o nome mudou. (§8.1)
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
  const g=/@UseGuards\(\s*RequireAuthGuard/.test(s);
  const re=/@(Get|Post|Patch|Put|Delete)\(\s*(?:'([^']*)')?\s*\)/g; let m;
  while((m=re.exec(s))) out.push([(g?'AUTH':'pub '), m[1].toUpperCase(), '/'+base+(m[2]?'/'+m[2]:'')]);}
out.sort((a,b)=>a[2].localeCompare(b[2]));
for(const o of out) console.log(o[0], (o[1]+'      ').slice(0,7), o[2]);
console.log('total de rotas:', out.length);
"
```

⚠️ **Um aviso sobre a coluna do guard:** ela é detectada **por arquivo**, não por handler. Um controller com duas rotas, uma guardada e outra não, aparece como `AUTH` nas duas. Como o padrão do projeto é um arquivo por ação, isso raramente engana - mas ao investigar uma rota específica, abra o arquivo. (Uma detecção por `grep` simples de `RequireAuthGuard` engana ainda mais: vários arquivos **citam o nome do guard em comentário justificando por que NÃO o usam** - `health.controller.ts` e `usuario.controller.listar-logins.ts` são dois exemplos. O regex acima procura `@UseGuards(RequireAuthGuard`, o que evita esses falsos positivos.)

### Documentos irmãos

| Arquivo | Assunto |
|---|---|
| `DOCUMENTACAO_BD.md` | O banco: schema, RLS, triggers, funções - e o log histórico das decisões |
| `DOCUMENTACAO_ERRCODE.md` | Tabela completa código → função → mensagem das 42 `RAISE EXCEPTION` |
| `PENDENCIAS e correcoes.md` | Decisões em aberto e histórico de correções - os itens 5, 6, 7, 8, 9, 11 e 22 são os que mais afetam o backend |
| `PROXIMOS_MODULOS.md` | O que falta construir, em ordem sugerida |
| `ARQUIVO - Dica de Arquitetura.md` | O "doc de arquitetura" citado nos comentários de `commons/storage` e `25-arquivo` |
| `ARQUIVO_para_configurar_modulo-arquivo.md` | Passo a passo do bucket + as variáveis `STORAGE_*` |
| `tutorial-rodar-projeto.md` | Instalação, incluindo o `ALTER ROLE app_nestjs LOGIN PASSWORD` obrigatório |
