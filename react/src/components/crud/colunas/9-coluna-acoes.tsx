import { AcaoLinha } from '../acao-linha';

// Coluna Ações: a GenericTable monta sozinha, sempre por último, a partir da prop `acoes` (a tela nunca a
// declara em `colunas`). Ocupa só a largura dos botões e fica presa à direita quando a tabela rola de lado.
//
// "Quais ações aparecem" e "quem trata cada ação" são a MESMA chave: ação exibida sem handler é erro de tipo, não
// um botão que não faz nada. A ordem na tela é fixa (alterar, consultar, excluir); só a presença da chave conta.
export type AcaoPadrao = 'alterar' | 'consultar' | 'excluir';

export type AcoesLinha<T> = Partial<Record<AcaoPadrao, (linha: T) => void>>;

const CLASSE_COLUNA_ACOES = 'crud-tabela__celula--centralizada crud-tabela__col--acoes';

export function CabecalhoAcoes() {
  return <th className={CLASSE_COLUNA_ACOES}>Ações</th>;
}

interface CelulaAcoesProps<T> {
  acoes: AcoesLinha<T>;
  linha: T;
}

export function CelulaAcoes<T>({ acoes, linha }: CelulaAcoesProps<T>) {
  // Handlers em const: o estreitamento de `acoes.alterar &&` não chega dentro da closure do `onClick`, e `!` é
  // proibido pelo eslint do projeto.
  const { alterar, consultar, excluir } = acoes;
  return (
    <td className={CLASSE_COLUNA_ACOES}>
      <div className="crud-tabela__acoes">
        {alterar && (
          <AcaoLinha rotulo="Alterar" icone="fa-pen" variante="alterar" onClick={() => alterar(linha)} />
        )}
        {consultar && <AcaoLinha rotulo="Consultar" icone="fa-eye" onClick={() => consultar(linha)} />}
        {excluir && (
          <AcaoLinha rotulo="Excluir" icone="fa-trash" variante="excluir" onClick={() => excluir(linha)} />
        )}
      </div>
    </td>
  );
}
