import { textoSeguro } from '../../../services/constant/util/formatacao.util';
import { comQuebrasNaturais, FORMATOS } from './formatos';
import type { TipoColuna } from './tipos-coluna';

// O "nome" do registro, mesmo quando o campo se chama título, descrição, chave ou versão: a 2ª coluna, a
// principal da tabela. Tem mínimo (nunca vira uma palavra por linha) e máximo (não vira uma faixa gigante em
// monitor largo); fica presa à esquerda, junto do id, quando a tabela rola de lado. Uma por tabela. Fica numa linha
// (DS-100): passando do máximo, corta com reticências; texto longo de propósito usa `umaLinha` ("ler tudo").
export const colunaNome: TipoColuna = {
  ...FORMATOS.texto,
  exibir: (valor) => <span className="crud-tabela__nome">{comQuebrasNaturais(textoSeguro(valor))}</span>,
  classe: 'crud-tabela__col--nome',
  largura: 'conteudo',
};
