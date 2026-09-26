import { textoSeguro } from '../../../services/constant/utils/formatacao.util';
import { comQuebrasNaturais } from './quebras-naturais';
import { compararTexto, type TipoColuna } from './tipo-coluna.type';

// Texto de tamanho variável que não é o nome do registro (e-mail, código, chave técnica, lista de papéis):
// alinhado à esquerda, largura pelo conteúdo. Quando a tabela aperta, primeiro a fonte diminui um passo
// (5-crud.css) e só depois o texto quebra, sempre em ponto natural.
export const colunaTexto: TipoColuna = {
  classe: 'crud-tabela__col--texto',
  exibir: (valor) => comQuebrasNaturais(textoSeguro(valor)),
  texto: textoSeguro,
  comparar: compararTexto,
  larguraPeloConteudo: true,
};
