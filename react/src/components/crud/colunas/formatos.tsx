import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { BadgeBooleano } from '../badge-booleano';
import {
  formatarData,
  formatarDataHora,
  formatarMoeda,
  textoSeguro,
} from '../../../services/constant/utils/formatacao.util';

// O FORMATO de um valor (como aparece, como a busca lê, como ordena), separado do ESPAÇO que a coluna ocupa
// (os arquivos numerados desta pasta). Dinheiro e data chegam crus da API: ordenam pelo valor, e o texto
// formatado só aparece na célula ("R$ 10.000,00" viria antes de "R$ 9.000,00" numa ordem alfabética).
export interface Formato {
  exibir: (valor: unknown) => ReactNode;
  // O texto que a pessoa vê na célula: é o que a busca procura e o que mede a largura pelo conteúdo.
  texto: (valor: unknown) => string;
  comparar: (a: unknown, b: unknown) => number;
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

// E-mail, chave técnica e código são uma "palavra" só (`suporte.sistema@crowdacademico.com.br`,
// `orcamento_min_itens`): sem ponto de quebra, a coluna não encolhe e a tabela inteira passa a rolar de lado.
// `<wbr>` depois de `@` e `_` só é usado quando falta espaço de verdade, e a quebra cai sempre num ponto
// natural, nunca no meio de uma palavra. Depois de `.` não: o e-mail viraria 3 linhas (`admin@`,
// `crowdacademico.`, `com.br`) em vez de 2.
export function comQuebrasNaturais(texto: string): ReactNode {
  const partes = texto.split(/(?<=[@_])/);
  if (partes.length === 1) {
    return texto;
  }
  return partes.map((parte, indice) => (
    <Fragment key={indice}>
      {parte}
      {indice < partes.length - 1 && <wbr />}
    </Fragment>
  ));
}

const numero = (valor: unknown): string => (typeof valor === 'number' ? valor.toLocaleString('pt-BR') : '');
const reais = (valor: unknown): string =>
  typeof valor === 'number' || typeof valor === 'string' ? formatarMoeda(valor) : '';
const iso = (valor: unknown): string | null => (typeof valor === 'string' ? valor : null);
const instante = (valor: unknown): number | null =>
  typeof valor === 'string' && valor !== '' ? Date.parse(valor) : null;
const simNao = (valor: unknown): string => (valor === true ? 'Sim' : valor === false ? 'Não' : '');

export const FORMATOS = {
  texto: { exibir: textoSeguro, texto: textoSeguro, comparar: compararTexto },
  numero: { exibir: numero, texto: numero, comparar: compararNumero },
  // Booleano vira badge Sim/Não, não o texto cru "true"/"false".
  simNao: {
    exibir: (valor) => (typeof valor === 'boolean' ? <BadgeBooleano valor={valor} /> : ''),
    texto: simNao,
    comparar: (a, b) => Number(a === true) - Number(b === true),
  },
  dinheiro: { exibir: reais, texto: reais, comparar: compararNumero },
  data: {
    exibir: (valor) => formatarData(iso(valor)),
    texto: (valor) => formatarData(iso(valor)),
    comparar: (a, b) => compararNumero(instante(a), instante(b)),
  },
  dataHora: {
    exibir: (valor) => formatarDataHora(iso(valor)),
    texto: (valor) => formatarDataHora(iso(valor)),
    comparar: (a, b) => compararNumero(instante(a), instante(b)),
  },
} satisfies Record<string, Formato>;
