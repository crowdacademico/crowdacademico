// Revisão do commit (lint-staged, chamado pelo husky; ver DOCUMENTACAO_LINT.md). Com muitos arquivos de uma vez, a
// lista de nomes estoura o limite de tamanho da linha de comando do Windows; nesse caso o ESLint confere a pasta src
// inteira.
const LIMITE = 40;

export default {
  'src/**/*.{ts,tsx}': (arquivos) =>
    arquivos.length > LIMITE ? 'eslint src' : `eslint ${arquivos.map((a) => JSON.stringify(a)).join(' ')}`,
};
