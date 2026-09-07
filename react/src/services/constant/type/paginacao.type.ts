// Espelha nest/src/commons/database/paginacao.util.ts (ResultadoPaginado<T>)
// - envelope genérico que GET /usuario, GET /configuracoes etc. devolvem.
// Hoje só usado como teto de segurança (ver comentário no arquivo
// original) - o React desembrulha `.dados` uma vez no `X.api.ts` e o
// resto do app nunca vê `total`/`pagina`/`tamanho`.
export interface ResultadoPaginado<T> {
  dados: T[];
  total: number;
  pagina: number;
  tamanho: number;
}
