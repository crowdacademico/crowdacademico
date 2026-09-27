import type { Formato } from './formatos';
import type { TipoColuna } from './tipos-coluna';

// Valor curto de conteúdo previsível: Sim/Não, status, número, dinheiro, data e data-hora. Centralizado e NUNCA
// quebra a linha (nem o valor nem o cabeçalho): a largura é a do maior valor da coluna. Colunas curtas do mesmo
// tipo na mesma tabela ficam com a mesma largura (ex.: as 4 Sim/Não de Tipos de Link, meta e arrecadado em
// Campanhas), calculada em generic-table.tsx.
export function colunaCurta(formato: Formato): TipoColuna {
  return {
    ...formato,
    classe: 'crud-tabela__celula--centralizada crud-tabela__col--curta',
    largura: 'curta',
  };
}
