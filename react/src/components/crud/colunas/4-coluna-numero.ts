import { compararNumero, type TipoColuna } from './tipo-coluna.type';

// Número que não é id nem dinheiro (ex.: score): centralizado, largura fixa, separador decimal pt-BR.
const formatar = (valor: unknown): string =>
  typeof valor === 'number' ? valor.toLocaleString('pt-BR') : '';

export const colunaNumero: TipoColuna = {
  classe: 'crud-tabela__celula--centralizada crud-tabela__col--numero',
  exibir: formatar,
  texto: formatar,
  comparar: compararNumero,
};
