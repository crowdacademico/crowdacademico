// Espelha nest/src/commons/database/paginacao.util.ts (ResultadoPaginado<T>)
// - envelope genérico que GET /usuario, GET /configuracoes etc. devolvem.
// Hoje só usado como teto de segurança (ver comentário no arquivo
// original) - o React desembrulha `.dados` uma vez no `X.api.ts` e o
// resto do app nunca vê `total`/`pagina`/`tamanho`.
// Teto que o backend aplica em qualquer listagem (nest/src/commons/database/
// paginacao.util.ts, 500). As telas pedem sempre o máximo, porque a paginação
// visível é feita no navegador (GenericTable). Um lugar só: se o teto do
// backend mudar, muda aqui junto.
export const TAMANHO_PAGINA_MAXIMO_API = 500;

export interface ResultadoPaginado<T> {
  dados: T[];
  total: number;
  pagina: number;
  tamanho: number;
}

// ADICIONADO (20-09-2026, achado numa revisão do Lucas): as 11 chamadas
// de listagem faziam `.then((resposta) => resposta.dados)` e jogavam o
// `total` fora. Como o backend limita em 500 (paginacao.util.ts), no
// registro 501 a tela passava a MENTIR silenciosamente - GenericTable
// mostraria "500 registros" existindo 3000, sem nenhum aviso em lugar
// nenhum. Não é hora de paginar no servidor (volume atual não justifica,
// e o teto de 500 é decisão consciente já documentada), mas truncar em
// silêncio é diferente de truncar avisando. Este helper substitui o
// `.then` cru nas 11 chamadas e mantém o mesmo retorno (`T[]`), então
// nenhum chamador muda.
export function desembrulharPaginado<T>(rotulo: string) {
  return (resposta: ResultadoPaginado<T>): T[] => {
    if (resposta.total > resposta.dados.length) {
      console.warn(
        `Listagem de ${rotulo} truncada: exibindo ${resposta.dados.length} de ${resposta.total}. Paginação no servidor precisa ser implementada.`,
      );
    }
    return resposta.dados;
  };
}
