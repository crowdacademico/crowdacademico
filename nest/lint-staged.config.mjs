// Revisão do commit (lint-staged, chamado pelo husky; ver DOCUMENTACAO_LINT.md). Com muitos arquivos de uma vez (ex.:
// renomeação em massa), a lista de nomes estoura o limite de tamanho da linha de comando do Windows; nesse caso o
// ESLint confere a pasta src inteira, com memória maior (o padrão do Node não basta para o projeto todo).
const LIMITE = 40;
const eslintNaPasta = 'node --max-old-space-size=8192 ./node_modules/eslint/bin/eslint.js src';

export default {
  'src/**/*.ts': (arquivos) =>
    arquivos.length > LIMITE ? eslintNaPasta : `eslint ${arquivos.map((a) => JSON.stringify(a)).join(' ')}`,
};
