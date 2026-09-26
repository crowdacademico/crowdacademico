import type { ReactNode } from 'react';
import { textoSeguro } from '../../../services/constant/utils/formatacao.util';

// Contrato de um tipo de coluna da GenericTable. A tela só diz o tipo (`tipo: 'dinheiro'`); como a coluna se
// comporta (largura, alinhamento, formato, ordenação, busca) mora no arquivo do tipo, igual em toda tabela.
// Largura e alinhamento ficam na classe CSS (5-crud.css), com tokens próprios.
export interface TipoColuna {
  classe: string;
  exibir: (valor: unknown) => ReactNode;
  // O texto que a pessoa vê na célula: é o que a busca procura e o que mede o piso de largura.
  texto: (valor: unknown) => string;
  // Ordena pelo valor CRU (número, data ISO), nunca pelo texto formatado: "R$ 10.000,00" viria antes de
  // "R$ 9.000,00" numa ordem alfabética.
  comparar: (a: unknown, b: unknown) => number;
  // Nome e texto não têm largura fixa: o piso sai do maior valor da lista INTEIRA (não só da página visível),
  // para a coluna não mudar de largura ao virar a página.
  larguraPeloConteudo?: boolean;
}

export const compararTexto = (a: unknown, b: unknown): number =>
  textoSeguro(a).localeCompare(textoSeguro(b), 'pt-BR', { numeric: true });

// Vazio (null/undefined) sempre no começo da ordem crescente, em vez de virar 0 e se misturar com um zero real.
export const compararNumero = (a: unknown, b: unknown): number => {
  const vazioA = a === null || a === undefined;
  const vazioB = b === null || b === undefined;
  if (vazioA || vazioB) {
    return Number(vazioB) - Number(vazioA);
  }
  return Number(a) - Number(b);
};
