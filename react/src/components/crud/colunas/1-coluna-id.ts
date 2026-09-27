import { FORMATOS } from './formatos';
import type { TipoColuna } from './tipos-coluna';

// 1ª coluna de toda tabela: estreita, centralizada, sem quebra de linha. Fica presa à esquerda quando a tabela
// rola de lado (ver 5-crud.css).
export const colunaId: TipoColuna = {
  ...FORMATOS.texto,
  comparar: FORMATOS.numero.comparar,
  classe: 'crud-tabela__coluna-id crud-tabela__celula--centralizada crud-tabela__col--id',
};
