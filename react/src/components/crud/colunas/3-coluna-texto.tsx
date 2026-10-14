import { textoSeguro } from '../../../services/constant/util/formatacao.util';
import { comQuebrasNaturais, FORMATOS } from './formatos';
import type { TipoColuna } from './tipos-coluna';

// Texto de tamanho variável que não é o nome do registro (e-mail, código, chave técnica, lista de papéis):
// alinhado à esquerda, largura pelo conteúdo, numa linha só (DS-100). Quando a tabela aperta, a fonte diminui um
// passo (5-crud.css) e, se ainda não couber, a tabela rola de lado.
export const colunaTexto: TipoColuna = {
  ...FORMATOS.texto,
  exibir: (valor) => comQuebrasNaturais(textoSeguro(valor)),
  classe: 'crud-tabela__col--texto',
  largura: 'conteudo',
};
