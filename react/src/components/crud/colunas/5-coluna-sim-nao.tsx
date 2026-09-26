import { BadgeBooleano } from '../badge-booleano';
import type { TipoColuna } from './tipo-coluna.type';

// Booleano vira badge Sim/Não (não o texto cru "true"/"false"), centralizado, largura fixa: várias colunas
// Sim/Não lado a lado ficam com o mesmo tamanho, seja qual for o rótulo do cabeçalho.
export const colunaSimNao: TipoColuna = {
  classe: 'crud-tabela__celula--centralizada crud-tabela__col--sim-nao',
  exibir: (valor) => (typeof valor === 'boolean' ? <BadgeBooleano valor={valor} /> : ''),
  texto: (valor) => (valor === true ? 'Sim' : valor === false ? 'Não' : ''),
  comparar: (a, b) => Number(a === true) - Number(b === true),
};
