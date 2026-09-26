import { formatarData, formatarDataHora } from '../../../services/constant/utils/formatacao.util';
import { compararNumero, type TipoColuna } from './tipo-coluna.type';

// Data (ISO vinda da API): formatada só na exibição, ordenada pelo instante real (nunca por "dd/mm/aaaa",
// que ordenaria pelo dia). Duas variantes: só a data, ou data e hora (largura um pouco maior).
const instante = (valor: unknown): number | null =>
  typeof valor === 'string' && valor !== '' ? Date.parse(valor) : null;

const iso = (valor: unknown): string | null => (typeof valor === 'string' ? valor : null);

export const colunaData: TipoColuna = {
  classe: 'crud-tabela__celula--centralizada crud-tabela__col--data',
  exibir: (valor) => formatarData(iso(valor)),
  texto: (valor) => formatarData(iso(valor)),
  comparar: (a, b) => compararNumero(instante(a), instante(b)),
};

export const colunaDataHora: TipoColuna = {
  classe: 'crud-tabela__celula--centralizada crud-tabela__col--data-hora',
  exibir: (valor) => formatarDataHora(iso(valor)),
  texto: (valor) => formatarDataHora(iso(valor)),
  comparar: (a, b) => compararNumero(instante(a), instante(b)),
};
