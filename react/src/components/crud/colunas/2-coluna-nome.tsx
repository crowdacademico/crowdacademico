import { textoSeguro } from '../../../services/constant/utils/formatacao.util';
import { comQuebrasNaturais } from './quebras-naturais';
import { compararTexto, type TipoColuna } from './tipo-coluna.type';

// O "nome" do registro, mesmo quando o campo se chama título, descrição, chave ou versão: a 2ª coluna, a
// principal da tabela. Tem mínimo (nunca vira uma palavra por linha) e máximo (não vira uma faixa gigante em
// monitor largo); fica presa à esquerda, junto do id, quando a tabela rola de lado. Uma por tabela. Chave
// técnica (`orcamento_min_itens`) pode quebrar depois do `_` quando falta espaço.
export const colunaNome: TipoColuna = {
  classe: 'crud-tabela__col--nome',
  exibir: (valor) => <span className="crud-tabela__nome">{comQuebrasNaturais(textoSeguro(valor))}</span>,
  texto: textoSeguro,
  comparar: compararTexto,
  larguraPeloConteudo: true,
};
