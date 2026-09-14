# Lint - `react/eslint.config.js`

Referência do estado atual do lint do `react/` - o que está ligado, por quê, e o que foi testado e deixado de fora de propósito. Documento de consulta, não de trabalho em andamento: não deve precisar de atualização com frequência, mas precisa existir pra você e a Alexia saberem o que há por trás do sistema sem precisar reconstruir o raciocínio do zero.

**Escopo: majoritariamente `react/`** (é onde está o detalhamento, achado por achado, da maioria das regras). O `nest/` tem seu próprio `eslint.config.mjs`, resumido na tabela abaixo - desde 14-09-2026, as 3 regras extras que o `nest/` liga (`no-floating-promises`, `no-unsafe-argument`, `no-unnecessary-condition`) já estão na mesma severidade `'error'` que o `react/` usa, mas só `no-unnecessary-condition` passou pela auditoria achado-por-achado de verdade (ver seção própria mais abaixo) - as outras duas já estavam com zero ocorrências reais, promovidas sem precisar corrigir nada.

---

## Lista completa - tudo que está ligado hoje, nos dois lados

### `react/eslint.config.js`

**Bases (presets herdados, não regra avulsa):** `js.configs.recommended` (só nos arquivos `.js`/`.jsx` da raiz - `eslint.config.js`/`vite.config.js`); `tseslint.configs.recommended` (todo `.ts`/`.tsx` de `src/`); `reactHooks.configs.flat.recommended`; `reactRefresh.configs.vite`.

**Regras extras, além do preset, hoje todas em `'error'`:**

| Regra | Desde |
|---|---|
| `@typescript-eslint/no-non-null-assertion` | 06-09-2026 |
| `@typescript-eslint/no-misused-promises` (`checksVoidReturn: { attributes: false }`) | 07-09-2026 |
| `@typescript-eslint/no-floating-promises` | 08-09-2026 |
| `@typescript-eslint/no-base-to-string` | 08-09-2026 |
| `@typescript-eslint/restrict-template-expressions` | 08-09-2026 |
| `@typescript-eslint/no-unsafe-argument` | 08-09-2026 |
| `@typescript-eslint/no-unnecessary-condition` | 12-09-2026 |

Detalhamento de cada uma (o quê, por quê, o que foi achado ao ligar) nas seções abaixo.

### `nest/eslint.config.mjs`

Essencialmente o esqueleto padrão que o `nest new` gera, mas hoje já com as mesmas 3 regras extras do `react/` na mesma severidade (`'error'`) - ver abaixo.

- **Bases:** `eslint.configs.recommended` (`@eslint/js`); `tseslint.configs.recommendedTypeChecked` (preset TS ciente de tipo, mais amplo que o `recommended` simples do React); `eslintPluginPrettierRecommended` (formatação, não é análise de bug).
- **Ajustes por cima do preset:** `@typescript-eslint/no-explicit-any` **desligado** (`'off'`) - o preset `recommendedTypeChecked` liga por padrão, decisão deliberada mantida (não reavaliada nesta rodada); `@typescript-eslint/no-floating-promises`, `@typescript-eslint/no-unsafe-argument` e `@typescript-eslint/no-unnecessary-condition` ligadas como `'error'` (14-09-2026) - mesma severidade que o `react/` já usa pras 3.
- **As duas primeiras (`no-floating-promises`/`no-unsafe-argument`) eram `'warn'` desde sempre - promovidas pra `'error'` sem precisar corrigir nenhum código**, porque já estavam com ZERO ocorrências reais no `nest/src` mesmo como aviso (confirmado rodando `eslint src` antes de promover). Só a rede de segurança estava mais fraca do que precisava - uma ocorrência nova não quebrava o build, só aparecia como aviso fácil de ignorar.

---

## Duas camadas de lint, não uma

**Camada 1 - lint de forma.** O ESLint "básico" (`js.configs.recommended`, e o `tseslint.configs.recommended` sem checagem de tipo) olha só a sintaxe: variável não usada, import faltando, hook do React chamado condicionalmente. Não sabe o que cada valor É, só como o código está escrito. Isto sempre esteve ligado no projeto.

**Camada 2 - lint ciente de tipo.** Ligada em 07-09-2026, depois que a migração de `react/` inteiro pra TypeScript terminou (ver `ACHADOS_PARA_DISCUTIR.md`, item 13, e a memória da migração). Essa camada enxerga o que cada valor REALMENTE é - "isto aqui é sempre uma Promise", "este campo nunca pode ser `null`" - e por isso encontra uma categoria de erro que a Camada 1 não vê: código que só existe por incerteza de tipo (uma sobra do tempo em que o compilador não conseguia provar algo), ou uma chamada assíncrona cujo tratamento de erro foi esquecido.

Tecnicamente, a Camada 2 exige `parserOptions.projectService` apontando pro `tsconfig.json` - é isso que dá ao ESLint acesso ao mesmo motor de tipos do próprio `tsc`, não só ao texto do arquivo.

---

## Configuração atual (`eslint.config.js`)

Dois blocos:

1. **`**/*.{js,jsx}`** - hoje só cobre `eslint.config.js`/`vite.config.js` (arquivos de configuração na raiz do projeto, que continuam JS puro de propósito). Zero arquivo de `src/` cai aqui - a migração pra TypeScript (07-09-2026) zerou todo `.js`/`.jsx` de dentro de `src/`.
2. **`**/*.{ts,tsx}`** - todo o código de verdade do app. Usa `tseslint.configs.recommended` como base (Camada 1) + `parserOptions.projectService` (habilita a Camada 2) + as regras extras da tabela abaixo.

### Regras ligadas além do padrão

Todas as regras da Camada 2 testadas até hoje acabaram adotadas - não sobrou nenhuma "testada e deixada de fora" (a tabela antiga desta seção listava 4 regras como pendentes; as 4 foram resolvidas em 08-09-2026, e a 5ª, `no-unnecessary-condition`, em 12-09-2026).

| Regra | Camada | Desde | Por quê |
|---|---|---|---|
| `@typescript-eslint/no-non-null-assertion` | forma | Fase 1 da migração TS (06-09-2026) | Proíbe o operador `!` (ex.: `valor!`) - mesma categoria de "confiar sem prova" que a migração evitou desde o início; usa `??`/reestruturação de código no lugar. |
| `@typescript-eslint/no-misused-promises`, com `checksVoidReturn: { attributes: false }` | tipo | 07-09-2026 | Sem a opção, todo `onClick`/`onSubmit` assíncrono (`onClick={async () => {...}}`, padrão usado em ~40 arquivos do painel) acusava erro - o React não liga pro retorno de uma Promise em atributo de evento, mas o TypeScript reclamava mesmo assim. A opção desliga só essa checagem específica (atributo JSX), mantendo as outras formas de uso indevido de Promise que a regra ainda pega. Testado antes de ligar: amostrados 4 handlers de módulos diferentes (`alterar-usuario.tsx`, `bancada-campanha.tsx`, `dev-login-rapido.tsx`, `menu-usuario.tsx`) - todos já tratavam erro internamente (try/catch ou `.catch()` explícito). Resultado: 69 ocorrências → 0. |
| `@typescript-eslint/no-floating-promises` | tipo | 08-09-2026 | Das 32 ocorrências (31 do achado original + 1 nova entre 07 e 08-09): 27 eram `navigate()` do react-router não aguardado (trivial, resolvido com `void`), 5 já tratavam erro internamente (também só precisaram de `void` pra declarar a intenção), e **1 era bug real** - `bancada-pesquisador.tsx` (`carregarPesquisadores`) podia falhar em silêncio, spinner some sem nenhum erro aparecer. Ganhou um `.catch()` de verdade (linha vermelha na própria tabela) antes da regra ser ligada. |
| `@typescript-eslint/no-base-to-string` | tipo | 08-09-2026 | As 4 ocorrências (`campo-somente-leitura.tsx`, `generic-table.tsx`, `log-auditoria-painel.tsx`) passaram a usar um util novo e compartilhado, `textoSeguro()` (`formatacao.util.ts`) - trata `object` explicitamente via `JSON.stringify` em vez de confiar no `toString()` padrão, então um valor-objeto real nunca mais viraria `"[object Object]"` visível. `use-chamada-registrada.ts` era um caso diferente (corpo de requisição, não valor de exibição), corrigido separadamente. |
| `@typescript-eslint/restrict-template-expressions` | tipo | 08-09-2026 | As 3 ocorrências (`generic-table.tsx`) - `linha[chavePrimaria]` envolto em `String(...)` explícito antes de entrar no template literal, mesmo padrão que a própria `key` da linha já usava. |
| `@typescript-eslint/no-unsafe-argument` | tipo | 08-09-2026 | `configuracoes-provider.tsx` - `.catch()` ganhou `instanceof Error` antes de guardar no estado, mesmo padrão de narrowing já usado no resto do projeto. |
| `@typescript-eslint/no-unnecessary-condition` | tipo | 12-09-2026 | As 57 ocorrências (cresceram de 41 pra 57 entre 07 e 12-09, com o trabalho novo em Campo de Testes) foram conferidas uma a uma contra o DTO Nest/tipo real correspondente - ver seção própria abaixo. |

Detalhamento completo do achado original (arquivo, linha, e o raciocínio de cada classificação) em `ACHADOS_PARA_DISCUTIR.md`, item 14.

---

## Sobre o achado que motivou ligar a Camada 2

Duas telas do painel (`services/12-campanha/constants/status-campanha.constants.ts` e `services/3-auth/hook/use-auth.ts`) tinham código que só existia porque, em algum momento da migração, o compilador ainda não conseguia provar que ele era desnecessário - um `??` de segurança cobrindo um valor de enum que o Postgres nunca produz, e duas guardas (`if (resultado.usuario)`) verificando campos que o próprio tipo já garante que nunca são vazios. Ninguém tinha achado isso de propósito - apareceu numa auditoria manual, achado por achado.

`no-unnecessary-condition` é a regra que teria apontado os dois sozinha, sem precisar de auditoria nenhuma - e foi exatamente essa a motivação de fazer a rodada de meio dia (ver seção abaixo).

---

## `no-unnecessary-condition` - as 57 ocorrências, uma a uma (12-09-2026)

Cada uma das 57 (17 arquivos) foi conferida contra o DTO Nest ou tipo real correspondente antes de decidir - nunca só apagada por confiar cegamente no lint. Caíram em 3 grupos:

**Grupo 1 - código morto de verdade, removido (a maioria).** Um `??`/`?.`/guarda cobrindo um caso que o tipo E os dados reais garantem que nunca acontece - mesma categoria do `?? 'badge-neutro'` já achado antes (item 13). Exemplos: `ROTULO_STATUS_CAMPANHA[status] ?? status`/`ROTULO_STATUS_PESQUISADOR[status] ?? status`/`ROTULO_TITULO_ACADEMICO[titulo] ?? titulo` (Record exaustivo sobre ENUM fechado, confirmado contra o Postgres), `PesquisadorLinha.usuario?.` (campo declarado obrigatório na interface E sempre populado na única construção real do objeto), `ResultadoPaginado.dados ?? []` (campo `T[]` obrigatório, espelhando `nest/src/commons/database/paginacao.util.ts`), e duas guardas redundantes em `bancada-pesquisador.tsx` (`chaveFoco !== null` depois de já estar dentro de um `{chaveFoco && (...)}`, `!perfil.usuario` sempre falso).

**Grupo 2 - proteção legítima, tipo corrigido pra ficar honesto (2 ocorrências).** `permissao-nomes-amigaveis.ts` (`DETALHE_PERMISSAO`) estava com tipo `Record<string, DetalhePermissao>` - mas o dicionário é fechado (só as permissões documentadas) enquanto quem chama passa `permissao.nome` vindo do banco, um espaço de chaves aberto. Uma permissão nova, semeada mas ainda não documentada aqui, é um caso real, não hipotético. Trocado pra `Partial<Record<string, DetalhePermissao>>` - o tipo passa a admitir `undefined` de verdade, e os dois fallbacks (que já existiam, corretos, desde antes) voltam a ser necessários pro compilador também, não só na prática.

**Grupo 3 - proteção legítima contra o próprio tipo embutido do TypeScript "mentir", mantida com `eslint-disable` comentado (2 ocorrências).** Duas APIs onde o `lib.d.ts` do TypeScript declara um retorno mais otimista do que a realidade: `JSON.stringify()` é tipado como `string` sempre, mas devolve `undefined` de verdade pra `função`/`símbolo`/`undefined` puro (`textoSeguro()` em `formatacao.util.ts`, e o preview de corpo de chamada em `registro-chamadas.tsx`); `navigator.clipboard` é tipado como sempre presente, mas a Clipboard API real só existe em contexto seguro (HTTPS/localhost) e falta em navegador mais antigo (`registro-chamadas.tsx`, botão "Copiar como cURL"). Nos dois casos, o comentário ao lado da linha explica o motivo específico - não é uma supressão genérica.

Verificado ao final: `eslint .` (0 ocorrências da regra, 0 erros/avisos no total), `tsc --noEmit` e `npm run build` limpos.

---

## `no-unnecessary-condition` no `nest/` - as 22 ocorrências, uma a uma (14-09-2026)

Tentativa anterior (12-09-2026, `ACHADOS_PARA_DISCUTIR.md` item 18) tinha esgotado memória rodando `no-unnecessary-condition` contra `nest/src` inteiro de uma vez, sem nunca ser retomada. A causa real não era falta de RAM na máquina (32GB, a maior parte livre) - era o limite padrão de heap do V8/Node. Rodando de novo com `NODE_OPTIONS=--max-old-space-size=8192`, o `eslint src` completo terminou em segundos, achando só **22 ocorrências em 10 arquivos** (bem menos que as 57 do `react/`, porque o `nest/` tem menos módulos implementados hoje). Cada uma conferida contra o tipo real (Kysely) ou a real amplitude do valor `unknown` antes de decidir - nunca só apagada por confiar no lint.

**Grupo 1 - código morto de verdade, provado pelo tipo do Kysely, removido (14 ocorrências, 7 sites).** Padrão idêntico nos 7 arquivos (`motivo-denuncia`, `configuracao`, `papel-permissao`, `usuario-papel`, `area-conhecimento`, `tipo-link`, `termo-uso` - todos os `*.service.remove.ts`/`*.service.excluir.ts` que fazem `db.deleteFrom(...).executeTakeFirst()`): `(resultado?.numDeletedRows ?? 0n) === 0n`. O tipo do próprio Kysely prova que é sempre morto - `SimplifySingleResult<O>` (`kysely/dist/util/type-utils.d.ts`) devolve `O` puro, nunca `O | undefined`, quando `O` é `InsertResult | UpdateResult | DeleteResult | MergeResult` (Postgres sempre sintetiza um resultado de comando pra essas operações, mesmo com 0 linhas afetadas - diferente de um `SELECT`, que pode legitimamente não achar nada). Simplificado pra `resultado.numDeletedRows === 0n` nos 7 arquivos, cada um com um comentário curto explicando o motivo (referenciando o primeiro, `motivo-denuncia.service.remove.ts`, pra não repetir o parágrafo inteiro 7 vezes).

**Grupo 2 - proteção legítima contra um valor genuinamente `unknown`/tipo de biblioteca que mente, mantida com `eslint-disable-next-line` comentado (8 ocorrências, 6 arquivos).** Todos os casos seguem o mesmo formato: um `catch (erro)` (`erro: unknown`) ou uma chamada de biblioteca cujo tipo declarado é mais otimista que a realidade, e um cast `as` que faz o TypeScript "esquecer" que o valor de origem podia ser nulo:
- **`database.service.ts`** (`!db`, depois de `this.cls.get<Kysely<DB>>(...)`) - `ClsService.get<T>()` (`nestjs-cls`) é tipado pra devolver `T` sempre, mas o próprio JSDoc do método (`cls.service.d.ts`) admite "returns the value stored under the key or undefined". O tipo mente; a guarda protege o cenário real que o comentário do arquivo já descrevia (chamar `getDb()` fora do pipeline HTTP, antes do `GlobalDbInterceptor` rodar).
- **`postgres-exception.filter.ts`** (`erro?.code`, 2×) - `traduzir(erro: ErroPostgres)` recebe `excecao as ErroPostgres` de um `catch(excecao: unknown, host)` **global** (`@Catch()` sem filtro de tipo) - captura literalmente qualquer coisa lançada em qualquer lugar da aplicação, presente ou futura. É a fronteira mais aberta do projeto pra esse tipo de cast - mantida defensiva de propósito.
- **`s3-compativel-armazenamento.service.ts`** (`erroTipado?.name`/`?.$metadata?.`, 2×) - mesmo padrão, `erro: unknown` de uma chamada ao SDK da AWS, cast pra inspecionar a forma do erro sem travar se vier algo inesperado.
- **`motivo-denuncia`/`area-conhecimento`/`tipo-link` (`*.service.remove.ts`)** (`(erro as { code?: string })?.code`, 1× cada) - mesmo padrão, dentro de um `catch` mais estreito (só 2 chamadas Kysely no `try`), mas mesma lógica: `as` é cast, não prova, e o custo de manter a defesa é zero.

Critério usado pra separar Grupo 1 de Grupo 2: se a "morte" do código é provada pelo **tipo real de uma biblioteca formal** (Kysely) → simplifica. Se depende de um **cast `as` sobre um valor `unknown`** (onde o TypeScript só finge saber a forma, não prova) → mantém, documentado. Mesmo espírito do Grupo 3 do `react/` (JSON.stringify/navigator.clipboard), aplicado a uma categoria nova (`unknown` de `catch`/SDK externo, não uma API do browser).

Verificado ao final: `eslint src` (0 ocorrências da regra, exit code determinado só pelos ~20 erros pré-existentes de prettier/`no-unnecessary-type-assertion` em arquivos NÃO tocados nesta rodada - `1-usuario`, `25-arquivo`, `storage.service.interface.ts`, confirmados por `git status` como já sujos antes desta rodada), `tsc --noEmit -p tsconfig.build.json` e `nest build` limpos. Servidor testado ao vivo (`npm run start:dev`): sobe, conecta no Postgres real como `app_nestjs` com RLS ativa, `Nest application successfully started`, zero erro - processo encerrado depois do teste.
