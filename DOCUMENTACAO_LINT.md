# Lint - `react/eslint.config.js` e `nest/eslint.config.mjs`

O que o lint confere nos dois lados do projeto, por que cada regra está ligada e como decidir quando ele acusa algo. O lint (ESLint) é um revisor automático de código: aponta erros comuns, como uma variável criada e nunca usada, uma chamada assíncrona sem tratamento de erro ou um import que cruza uma fronteira proibida.

## 📑 Índice

1. [Duas camadas de lint](#1-duas-camadas-de-lint)
2. [O que está ligado no `react/`](#2-o-que-está-ligado-no-react)
3. [O que está ligado no `nest/`](#3-o-que-está-ligado-no-nest)
4. [Fronteiras que o lint guarda](#4-fronteiras-que-o-lint-guarda)
5. [Checagem no commit (husky + lint-staged)](#5-checagem-no-commit-husky--lint-staged)
6. [Quando o lint diz que uma condição é desnecessária](#6-quando-o-lint-diz-que-uma-condição-é-desnecessária)
7. [Como rodar](#7-como-rodar)

---

## 1. Duas camadas de lint

**Camada 1, lint de forma.** Olha só como o código está escrito: variável não usada, import faltando, hook do React chamado dentro de um `if`. Não sabe o que cada valor é.

**Camada 2, lint ciente de tipo.** Enxerga o que cada valor realmente é ("isto é sempre uma Promise", "este campo nunca é `null`") e por isso acha o que a Camada 1 não vê: código que só existe por incerteza de tipo, ou uma chamada assíncrona cujo erro ninguém trata. Exige `parserOptions.projectService` apontando para o `tsconfig.json`: é o que dá ao ESLint o mesmo motor de tipos do `tsc`.

Os dois lados usam as duas camadas.

---

## 2. O que está ligado no `react/`

O `eslint.config.js` tem dois blocos de arquivos:

1. **`**/*.{js,jsx}`:** só os arquivos de configuração da raiz (`eslint.config.js`, `vite.config.js`), que continuam JavaScript de propósito. Nenhum arquivo de `src/` é JavaScript. Bases: `js.configs.recommended`, `reactHooks.configs.flat.recommended`, `reactRefresh.configs.vite`.
2. **`**/*.{ts,tsx}`:** todo o código do app. Bases: `tseslint.configs.recommended` (Camada 1) mais `projectService` (Camada 2), os hooks do React e o `react-refresh`.

**Regras extras, todas em `'error'`:**

| Regra | Camada | O que barra, e por quê |
|---|---|---|
| `@typescript-eslint/no-non-null-assertion` | forma | O operador `!` (`valor!`): é confiar sem prova. No lugar, `??` ou reestruturar o código. |
| `@typescript-eslint/no-misused-promises`, com `checksVoidReturn: { attributes: false }` | tipo | Promise usada onde não devia. A opção libera só o atributo JSX (`onClick={async () => ...}`), porque o React ignora o retorno do evento; os outros usos indevidos continuam barrados. Todo handler assíncrono trata o próprio erro. |
| `@typescript-eslint/no-floating-promises` | tipo | Chamada assíncrona solta, cujo erro sumiria em silêncio. Quando a intenção é mesmo não esperar (ex.: `navigate()`), escreve-se `void`. |
| `@typescript-eslint/no-base-to-string` | tipo | Objeto virando `"[object Object]"` na tela. Valores de exibição passam por `textoSeguro()` (`formatacao.util.ts`), que trata objeto com `JSON.stringify`. |
| `@typescript-eslint/restrict-template-expressions` | tipo | Valor de tipo incerto dentro de template literal; converte-se com `String(...)` explícito. |
| `@typescript-eslint/no-unsafe-argument` | tipo | Valor `any` passado adiante; o erro de `catch` é estreitado com `instanceof Error` antes de ir para o estado. |
| `@typescript-eslint/no-unnecessary-condition` | tipo | `??`, `?.` ou `if` que o tipo prova que nunca dispara. Como decidir cada caso: seção 6. |

---

## 3. O que está ligado no `nest/`

- **Bases:** `eslint.configs.recommended` (`@eslint/js`), `tseslint.configs.recommendedTypeChecked` (Camada 2, mais amplo que o `recommended` do React) e `eslintPluginPrettierRecommended` (formatação).
- **`@typescript-eslint/no-explicit-any` desligado** (`'off'`): o preset liga por padrão; aqui fica desligado de propósito.
- **Em `'error'`, como no `react/`:** `no-floating-promises`, `no-unsafe-argument` e `no-unnecessary-condition`.

---

## 4. Fronteiras que o lint guarda

| Onde | Regra | O que garante |
|---|---|---|
| `react/` (todo `src/` menos `src/30-campo-testes/`) | `no-restricted-imports` | O sistema nunca importa o Campo de Testes; a única porta é o glob de `src/services/router/campo-testes-opcional.ts`. Apagar `src/30-campo-testes/` não quebra o build. |
| `nest/` (todo `src/` menos `src/30-campo-testes/` e `src/app/app.module.ts`) | `@typescript-eslint/no-restricted-imports` | A mesma regra do Campo de Testes: a única porta é o `app.module.ts`, que só o carrega fora de produção. Usa a versão do typescript-eslint de propósito: a versão padrão já guarda a fronteira do provedor (linha abaixo), e duas configurações da mesma regra nos mesmos arquivos fazem a última apagar a primeira. |
| `nest/` (todo `src/` menos `src/23-pagamento/adapters/asaas/` e `pagamento.module.ts`) | `no-restricted-imports` e `no-restricted-syntax` | O nome do provedor de pagamento e o formato do JSON dele existem só dentro do adapter dele. Fora dali, nada importa o adapter nem escreve o nome numa string; o resto do sistema fala com as portas (`COBRANCA_GATEWAY`, `REPASSE_GATEWAY`, `WEBHOOK_VERIFIER`). Trocar de provedor é criar outra pasta de adapter e um caso novo em `pagamento.module.ts`. Comentários não contam. |

---

## 5. Checagem no commit (husky + lint-staged)

**Em palavras simples.** O lint roda sozinho toda vez que alguém salva uma versão do código no git (`git commit`). São duas ferramentas juntas:

- **husky** é o "porteiro": no momento do commit, chama a revisão antes de deixar o commit acontecer.
- **lint-staged** é o "revisor rápido": revisa só os arquivos que a pessoa mudou e está commitando, não o projeto inteiro.

A pessoa faz `git add` e `git commit`, o husky chama o lint-staged, e ele roda o ESLint só nos arquivos alterados. Com erro, o commit é recusado e o erro aparece na tela; sem erro, o commit passa. O erro é pego na hora, por quem acabou de escrever o código.

- **Onde mora:** o `package.json` da raiz existe só para isso (`husky` e `lint-staged`); o gancho está em `.husky/pre-commit` e as regras em `nest/lint-staged.config.mjs` (`src/**/*.ts`) e `react/lint-staged.config.mjs` (`src/**/*.{ts,tsx}`). Cada lado usa o próprio `eslint.config`.
- **Com mais de 40 arquivos no commit**, o ESLint confere a pasta `src` inteira, com memória maior (`--max-old-space-size=8192`), porque a lista de nomes estoura o limite de tamanho da linha de comando do Windows.
- **Só barra erro, não aviso.** Não formata nada: o Prettier fica de fora porque, no `react/`, sem `.prettierrc`, ele reformataria arquivos inteiros.
- **Só vale depois de `npm install` na raiz**; quem não rodar commita sem a checagem.
- **Para pular numa emergência:** `git commit --no-verify`. **Para desligar de vez:** apagar `.husky/`, o `package.json` da raiz e os dois `lint-staged.config.mjs`, e rodar `git config --unset core.hooksPath`.

**Commit barrado?** Passo a passo para descobrir e resolver: `.Tutorial-rodar-projeto.md`, seção "Meu commit foi barrado".

---

## 6. Quando o lint diz que uma condição é desnecessária

`no-unnecessary-condition` acusa um `??`, `?.` ou `if` que o tipo prova que nunca dispara. Cada caso é conferido contra o tipo real (o DTO do Nest, o tipo do Kysely, o ENUM do banco) antes de decidir; nunca se apaga só porque o lint mandou. Há três saídas:

1. **Código morto de verdade: remove.** O tipo e os dados reais garantem que o caso não acontece. Exemplos: `ROTULO_STATUS_CAMPANHA[status] ?? status` sobre um `Record` exaustivo de um ENUM fechado; `ResultadoPaginado.dados ?? []` com `dados` obrigatório; no Nest, `(resultado?.numDeletedRows ?? 0n)` num `DELETE` do Kysely, que sempre devolve um resultado (o tipo `SimplifySingleResult` prova isso), e por isso é `resultado.numDeletedRows === 0n` nos `*.service.remove.ts`.
2. **A proteção é legítima e o tipo mentia: corrige o tipo.** Exemplo: `DETALHE_PERMISSAO` (`permissao-nomes-amigaveis.constants.ts`) é `Partial<Record<string, DetalhePermissao>>`, porque quem chama passa um nome vindo do banco e uma permissão nova pode não estar documentada ainda. Com o tipo honesto, o fallback volta a ser necessário também para o compilador. O mesmo vale para o dicionário de frases da auditoria financeira (`evento-financeiro.util.ts`).
3. **A biblioteca promete mais do que entrega: mantém, com `eslint-disable-next-line` e o motivo escrito ao lado.** Exemplos:
   - `JSON.stringify()` é tipado como `string`, mas devolve `undefined` para função, símbolo e `undefined` (`textoSeguro()`, e o corpo de chamada em `registro-chamadas.tsx`);
   - `navigator.clipboard` é tipado como sempre presente, mas só existe em contexto seguro (botão "Copiar como cURL" de `registro-chamadas.tsx`);
   - `ClsService.get<T>()` (`nestjs-cls`) é tipado como `T`, mas o próprio JSDoc admite `undefined` (`database.service.ts`, `getDb()` chamado fora do pipeline HTTP);
   - erro de `catch` (`unknown`) convertido com `as` para ler o código: `postgres-exception.filter.ts` (o filtro global, que pega qualquer coisa lançada no sistema), `s3-compativel-armazenamento.service.ts` (erro do SDK do armazenamento) e os `*.service.remove.ts` de catálogo.

**Critério entre a 1 e a 3:** se a "morte" do código é provada pelo tipo de uma biblioteca formal (Kysely, ENUM do banco), simplifica. Se depende de um `as` sobre um valor `unknown`, em que o TypeScript só finge saber a forma, mantém e documenta.

---

## 7. Como rodar

- `react/`: `npx eslint .` (ou `npm run lint`).
- `nest/`: `npx eslint src`. O projeto inteiro de uma vez pode estourar o limite de memória padrão do Node: aumente com `NODE_OPTIONS=--max-old-space-size=8192` antes de dividir por módulo ou desconfiar da máquina.
- Junto do lint, confira os tipos: `npx tsc --noEmit -p tsconfig.json` no `react/` e no `nest/`.
