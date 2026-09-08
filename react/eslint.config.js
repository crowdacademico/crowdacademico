import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Todo o código de src/ é TypeScript (migração concluída, 07-09-2026) -
  // bloco separado do de cima (que agora só cobre eslint.config.js/
  // vite.config.js, na raiz) porque tseslint.configs.recommended já
  // conhece tipo, não precisa do js.configs.recommended genérico, e não
  // deve reaproveitar parserOptions de JS puro.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    // `projectService` (07-09-2026) - lint ciente de tipo, não só de forma.
    // Habilita regras que enxergam o que cada valor REALMENTE é (ex.: "isto
    // aqui é sempre uma Promise") - achou sozinho, num teste, a mesma
    // categoria de achado que só tínhamos pegado na mão até agora (ver
    // ACHADOS_PARA_DISCUTIR.md). `no-misused-promises` adotada nesta
    // rodada (achado limpo, zero pendência depois do ajuste).
    //
    // ATUALIZADO (08-09-2026): mais 3 adotadas, depois de cada achado ser
    // corrigido de verdade (nunca só silenciado) - `no-floating-promises`
    // (1 bug real corrigido - listagem de Bancada do Pesquisador sem
    // `.catch()`, resto era `navigate()` sem esperar, resolvido com `void`);
    // `no-base-to-string` (4 ocorrências - novo util compartilhado
    // `textoSeguro()` em `formatacao.util.ts`, evita "[object Object]" de
    // verdade em vez de só confiar que nunca vai acontecer);
    // `restrict-template-expressions` (3 ocorrências em `generic-table.tsx`,
    // `String()` explícito antes de interpolar); `no-unsafe-argument` (1
    // ocorrência, `configuracoes-provider.tsx` - narrowing `instanceof Error`
    // antes de guardar no estado). Só `no-unnecessary-condition` continua de
    // fora de propósito - as 41 ocorrências exigem conferir DTO por DTO pra
    // separar código morto de proteção legítima (ver ACHADOS_PARA_DISCUTIR.md,
    // item 14) - meio dia de trabalho, fica pra uma rodada própria.
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
      // `checksVoidReturn: { attributes: false }` - sem isso, TODO
      // `onClick`/`onSubmit` assíncrono (`onClick={async () => {...}}`,
      // padrão usado em ~40 arquivos) acusava erro, mesmo o React não
      // ligando pro retorno. Testado antes de ligar: amostrado 4 handlers
      // de módulos diferentes, todos já tratam erro internamente
      // (try/catch ou .catch() explícito) - com essa opção, a regra caiu
      // de 69 pra 0 ocorrências, mantendo as outras checagens da regra
      // ativas (só a de atributo JSX foi desligada).
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-base-to-string': 'error',
      '@typescript-eslint/restrict-template-expressions': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
    },
  },
])
