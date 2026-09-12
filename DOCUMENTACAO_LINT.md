# Lint - `react/eslint.config.js`

Referência do estado atual do lint do `react/` - o que está ligado, por quê, e o que foi testado e deixado de fora de propósito. Documento de consulta, não de trabalho em andamento: não deve precisar de atualização com frequência, mas precisa existir pra você e a Alexia saberem o que há por trás do sistema sem precisar reconstruir o raciocínio do zero.

**Escopo: majoritariamente `react/`** (é onde está o detalhamento, achado por achado, de cada regra). O `nest/` tem seu próprio `eslint.config.mjs`, resumido na tabela abaixo pra este documento não fingir que ele não existe, mas sem o mesmo nível de detalhe - nunca passou pela mesma revisão de "testar, achar, corrigir de verdade" que o `react/` passou.

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

Nunca reformado - é essencialmente o esqueleto padrão que o `nest new` gera, sem a mesma auditoria de regra por regra que o `react/` recebeu. Registrado aqui só pra este documento ser a lista completa que o Lucas pediu (12-09-2026), não como recomendação de mexer agora:

- **Bases:** `eslint.configs.recommended` (`@eslint/js`); `tseslint.configs.recommendedTypeChecked` (preset TS ciente de tipo, mais amplo que o `recommended` simples do React); `eslintPluginPrettierRecommended` (formatação, não é análise de bug).
- **Ajustes por cima do preset:** `@typescript-eslint/no-explicit-any` **desligado** (`'off'`) - o preset `recommendedTypeChecked` liga por padrão; `@typescript-eslint/no-floating-promises` e `@typescript-eslint/no-unsafe-argument` rebaixados pra `'warn'` (o preset liga como erro) - as mesmas duas regras que o `react/` tem como `'error'` depois de uma auditoria dedicada.
- **Achado ao escrever esta lista (12-09-2026, não investigado a fundo ainda):** o backend nunca passou pela mesma rodada de "rodar com o preset completo, contar ocorrência, decidir uma a uma" que o `react/` recebeu nesta sessão. `no-floating-promises`/`no-unsafe-argument` como `warn` (não `error`) significa que uma ocorrência nova não quebra o build, só aparece como aviso - pode valer a pena, um dia, repetir no `nest/` o mesmo processo já feito aqui. Não é uma pendência formal ainda, é só a lacuna ficando visível ao montar esta lista.

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
