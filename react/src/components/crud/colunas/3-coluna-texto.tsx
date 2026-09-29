import { textoSeguro } from '../../../services/constant/util/formatacao.util';
import { comQuebrasNaturais, FORMATOS } from './formatos';
import type { TipoColuna } from './tipos-coluna';

// Texto de tamanho variável que não é o nome do registro (e-mail, código, chave técnica, lista de papéis):
// alinhado à esquerda, largura pelo conteúdo. Quando a tabela aperta, primeiro a fonte diminui um passo
// (5-crud.css) e só depois o texto quebra, sempre em ponto natural.
export const colunaTexto: TipoColuna = {
  ...FORMATOS.texto,
  exibir: (valor) => comQuebrasNaturais(textoSeguro(valor)),
  classe: 'crud-tabela__col--texto',
  largura: 'conteudo',
};
