import { textoSeguro } from '../../../services/constant/utils/formatacao.util';
import { compararNumero, type TipoColuna } from './tipo-coluna.type';

// 1ª coluna de toda tabela: estreita, centralizada, sem quebra de linha. Fica presa à esquerda quando a tabela
// rola de lado (ver 5-crud.css).
export const colunaId: TipoColuna = {
  classe: 'crud-tabela__coluna-id crud-tabela__celula--centralizada crud-tabela__col--id',
  exibir: textoSeguro,
  texto: textoSeguro,
  comparar: compararNumero,
};
