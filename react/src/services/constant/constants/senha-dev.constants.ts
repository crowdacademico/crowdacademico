// Senha de todas as contas do seed (07_seed_dados.sql, [07-D-1]). Só existe em desenvolvimento: em `npm run
// build` o Vite troca `import.meta.env.DEV` por `false` e a senha some do pacote de produção.
export const SENHA_DEV = import.meta.env.DEV ? 'DevTcc123!' : '';
