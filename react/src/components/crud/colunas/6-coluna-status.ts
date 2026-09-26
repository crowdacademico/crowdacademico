import { textoSeguro } from '../../../services/constant/utils/formatacao.util';
import { compararTexto, type TipoColuna } from './tipo-coluna.type';

// Status, tipo ou qualquer rótulo curto de uma lista fixa (ex.: "Ativo", "Score baixo", "Cadastro"): a tela
// entrega o rótulo já traduzido (o mesmo que os filtros usam); aqui fica centralizado, com largura fixa.
export const colunaStatus: TipoColuna = {
  classe: 'crud-tabela__celula--centralizada crud-tabela__col--status',
  exibir: textoSeguro,
  texto: textoSeguro,
  comparar: compararTexto,
};
