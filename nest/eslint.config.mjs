// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      // PROMOVIDAS de 'warn' pra 'error' (14-09-2026) - já estavam com ZERO
      // ocorrências reais no nest/src mesmo como 'warn' (confirmado rodando
      // eslint src antes de promover), então não havia nenhum código pra
      // corrigir - só a rede de segurança estava mais fraca que precisava
      // (um floating promise ou argumento sem tipo novo só apareceria como
      // aviso, não quebraria o build). Mesma severidade que o react/ já usa
      // pras duas desde a auditoria de 07/08-09-2026.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      // ADOTADA (14-09-2026) - mesma regra já ligada no react/ desde
      // 12-09-2026. As 22 ocorrências achadas foram conferidas uma a uma
      // (não só apagadas por confiar no lint): 14 eram código morto de
      // verdade, provado pelo próprio tipo do Kysely (`executeTakeFirst()`
      // de INSERT/UPDATE/DELETE nunca resolve pra `undefined`) - removidas.
      // As outras 8 são proteção legítima contra um `unknown`/tipo de
      // biblioteca que mente (cast `as` numa fronteira genuinamente aberta,
      // ou `ClsService.get<T>()` cujo próprio JSDoc admite "or undefined"
      // apesar do tipo dizer `T`) - mantidas com `eslint-disable-next-line`
      // comentado. Detalhe completo em DOCUMENTACAO_LINT.md.
      '@typescript-eslint/no-unnecessary-condition': 'error',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
);
