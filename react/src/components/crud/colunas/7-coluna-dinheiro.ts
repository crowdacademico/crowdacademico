import { formatarMoeda } from '../../../services/constant/utils/formatacao.util';
import { compararNumero, type TipoColuna } from './tipo-coluna.type';

// Valor em reais: a tela entrega o número cru; o R$ só aparece na exibição, e a ordem segue o valor.
const formatar = (valor: unknown): string =>
  typeof valor === 'number' || typeof valor === 'string' ? formatarMoeda(valor) : '';

export const colunaDinheiro: TipoColuna = {
  classe: 'crud-tabela__celula--centralizada crud-tabela__col--dinheiro',
  exibir: formatar,
  texto: formatar,
  comparar: compararNumero,
};
