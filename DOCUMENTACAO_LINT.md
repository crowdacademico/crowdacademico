# Lint - `react/eslint.config.js`

Referência do estado atual do lint do `react/` - o que está ligado, por quê, e o que foi testado e deixado de fora de propósito. Documento de consulta, não de trabalho em andamento: não deve precisar de atualização com frequência, mas precisa existir pra você e a Alexia saberem o que há por trás do sistema sem precisar reconstruir o raciocínio do zero.

**Escopo: só `react/`.** O `nest/` (backend) não tem lint ciente de tipo configurado - é TypeScript desde o início do projeto, mas o `eslint.config.js` de lá nunca passou por essa mesma revisão. Nada neste documento se aplica ao backend.

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

| Regra | Camada | Desde | Por quê |
|---|---|---|---|
| `@typescript-eslint/no-non-null-assertion` | forma | Fase 1 da migração TS (06-09-2026) | Proíbe o operador `!` (ex.: `valor!`) - mesma categoria de "confiar sem prova" que a migração evitou desde o início; usa `??`/reestruturação de código no lugar. |
| `@typescript-eslint/no-misused-promises`, com `checksVoidReturn: { attributes: false }` | tipo | 07-09-2026 | Sem a opção, todo `onClick`/`onSubmit` assíncrono (`onClick={async () => {...}}`, padrão usado em ~40 arquivos do painel) acusava erro - o React não liga pro retorno de uma Promise em atributo de evento, mas o TypeScript reclamava mesmo assim. A opção desliga só essa checagem específica (atributo JSX), mantendo as outras formas de uso indevido de Promise que a regra ainda pega. Testado antes de ligar: amostrados 4 handlers de módulos diferentes (`alterar-usuario.tsx`, `bancada-campanha.tsx`, `dev-login-rapido.tsx`, `menu-usuario.tsx`) - todos já tratavam erro internamente (try/catch ou `.catch()` explícito). Resultado: 69 ocorrências → 0. |

### Regras testadas e deixadas de fora, de propósito

A Camada 2 foi testada de uma vez com o preset completo (`recommendedTypeChecked`) antes de decidir o que manter - achou mais 4 categorias, nenhuma adotada ainda:

| Regra | Ocorrências achadas | Por que não está ligada |
|---|---|---|
| `no-floating-promises` | 31 (todas revisadas uma a uma) | 27 são triviais (`navigate()` do react-router, não aguardado - navegação client-side não produz erro que valha tratar) e 3 já tratam erro internamente. **1 é achado real**: `views/campo-testes/bancada-pesquisador.tsx:163` pode falhar em silêncio (spinner some, nenhum erro aparece). Ligar a regra exige resolver esse 1 caso primeiro - senão a regra nasce já com uma pendência. |
| `no-unnecessary-condition` | 41, em 17 arquivos | A regra confia que os tipos declarados são sempre verdade. Mas os tipos de `type/` (Fase 2 da migração) são espelho MANUAL dos DTOs do Nest, não importados de verdade - um campo "obrigatório" no frontend pode legitimamente vir vazio se o espelho um dia divergir do backend. Distinguir código morto de verdade (como o `?? 'badge-neutro'` já removido, ver achado 13) de proteção legítima contra essa divergência exige conferir o DTO Nest correspondente pra cada um dos 41 - meio dia de trabalho, não uma configuração de 5 minutos. |
| `no-base-to-string` | 4 | Todas em componentes genéricos (`campo-somente-leitura.tsx`, `generic-table.tsx`, `log-auditoria-painel.tsx`, `use-chamada-registrada.ts`) que tipam um valor como `unknown` de propósito (reaproveitados por toda tela) e o convertem pra texto com `String(valor ?? '')`. Nenhum chamador conhecido hoje passa um objeto ali (viraria `"[object Object]"` visível), mas corrigir sem confirmar caso a caso mudaria o que aparece na tela em vez do tipo - decisão de comportamento, não só de tipo. |
| `restrict-template-expressions` | 3 | Todas em `generic-table.tsx`, interpolando um valor de tipo genérico (`T[keyof T & string]`) num template literal - mesma limitação de tipo genérico do item acima, não indício de bug. |
| `no-unsafe-argument` | 1 | `configuracoes-provider.tsx:57` - parâmetro de `.catch()` é sempre `any` pro TypeScript (rejeição de Promise pode ser qualquer coisa em JS puro), passado direto pra um setter tipado sem checar `instanceof Error` antes. Padrão já usado em outros lugares do projeto (`catch (erro: unknown)` + narrowing) não foi seguido aqui - candidato a correção pequena numa rodada própria. |

Detalhamento completo (arquivo, linha, e o raciocínio de cada classificação) em `ACHADOS_PARA_DISCUTIR.md`, item 14.

---

## Sobre o achado que motivou ligar a Camada 2

Duas telas do painel (`services/12-campanha/constants/status-campanha.constants.ts` e `services/3-auth/hook/use-auth.ts`) tinham código que só existia porque, em algum momento da migração, o compilador ainda não conseguia provar que ele era desnecessário - um `??` de segurança cobrindo um valor de enum que o Postgres nunca produz, e duas guardas (`if (resultado.usuario)`) verificando campos que o próprio tipo já garante que nunca são vazios. Ninguém tinha achado isso de propósito - apareceu numa auditoria manual, achado por achado.

`no-unnecessary-condition` é a regra que teria apontado os dois sozinha, sem precisar de auditoria nenhuma. Ela está desligada por enquanto (ver tabela acima), mas é o motivo de valer a pena, um dia, fazer a rodada de meio dia que ela exige - depois disso, essa categoria inteira de código morto para de precisar ser caçada à mão.
