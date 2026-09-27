// Como as colunas entre NOME e Ações dividem o espaço que sobra numa tabela larga (regras em 5-crud.css,
// `.crud-tabela[data-distribuicao=...]`). Um modo só para o sistema inteiro, para toda tabela ter a mesma cara.
//
// 'direita': texto e curta ficam do tamanho do próprio conteúdo, encostadas em Ações; o NOME fica com a sobra, e
// parte dela volta como respiro igual entre as colunas do meio (generic-table.tsx, ajustarRespiro), que some
// quando falta espaço. Para testar outro modo, acrescente o valor aqui e a regra no CSS.
export type DistribuicaoColunas = 'direita';

export const DISTRIBUICAO_COLUNAS: DistribuicaoColunas = 'direita';
