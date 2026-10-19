import { AcaoLinha } from '../acao-linha';

// Coluna Ações: a GenericTable monta sozinha, sempre por último, a partir da prop `acoes` (a tela nunca a
// declara em `colunas`). Ocupa só a largura dos botões e fica presa à direita quando a tabela rola de lado.
//
// "Quais ações aparecem" e "quem trata cada ação" são a MESMA chave: ação exibida sem handler é erro de tipo, não
// um botão que não faz nada. A ordem na tela é a das listas abaixo; só a presença da chave conta.

interface DefinicaoAcao<A> {
  acao: A;
  rotulo: string;
  icone: string;
  variante?: 'alterar' | 'excluir' | 'aviso' | 'erro';
  vazado?: boolean;
}

// Ações do sistema

export type AcaoSistema = 'alterar' | 'consultar' | 'reenviar' | 'cancelarEnvio' | 'excluir';

const ACOES_SISTEMA: DefinicaoAcao<AcaoSistema>[] = [
  { acao: 'alterar', rotulo: 'Alterar', icone: 'fa-pen', variante: 'alterar' },
  { acao: 'consultar', rotulo: 'Consultar', icone: 'fa-eye' },
  // E-mails do sistema (aba Notificações): tratamento manual do que falhou.
  { acao: 'reenviar', rotulo: 'Reenviar', icone: 'fa-paper-plane', variante: 'alterar' },
  { acao: 'cancelarEnvio', rotulo: 'Cancelar envio', icone: 'fa-ban', variante: 'excluir' },
  { acao: 'excluir', rotulo: 'Excluir', icone: 'fa-trash', variante: 'excluir' },
];

// Ações do Campo de Testes

export type AcaoCampoTestes =
  | 'upgrade'
  | 'comentar'
  | 'seguir'
  | 'deixarDeSeguir'
  | 'denunciar'
  | 'pagar'
  | 'liberarDinheiro'
  | 'vencer'
  | 'repetirAviso'
  | 'concluirTransferencia'
  | 'falharTransferencia';

const ACOES_CAMPO_TESTES: DefinicaoAcao<AcaoCampoTestes>[] = [
  { acao: 'upgrade', rotulo: 'Upgrade', icone: 'fa-lock', variante: 'aviso' },
  { acao: 'comentar', rotulo: 'Comentar', icone: 'fa-comment' },
  { acao: 'seguir', rotulo: 'Seguir', icone: 'fa-heart', variante: 'erro', vazado: true },
  { acao: 'deixarDeSeguir', rotulo: 'Deixar de seguir', icone: 'fa-heart', variante: 'erro' },
  { acao: 'denunciar', rotulo: 'Denunciar', icone: 'fa-flag', variante: 'erro' },
  // Bancada de pagamento (T05): o papel do provedor de pagamento.
  { acao: 'pagar', rotulo: 'Pagar', icone: 'fa-money-bill-wave', variante: 'alterar' },
  { acao: 'liberarDinheiro', rotulo: 'Liberar o dinheiro do cartão', icone: 'fa-unlock', variante: 'alterar' },
  { acao: 'vencer', rotulo: 'Fazer a cobrança vencer', icone: 'fa-hourglass-end', variante: 'aviso' },
  { acao: 'repetirAviso', rotulo: 'Repetir o último aviso do provedor', icone: 'fa-rotate-right' },
  { acao: 'concluirTransferencia', rotulo: 'Concluir a transferência', icone: 'fa-check', variante: 'alterar' },
  { acao: 'falharTransferencia', rotulo: 'Falhar a transferência', icone: 'fa-xmark', variante: 'erro' },
];

// Coluna

export type AcaoPadrao = AcaoSistema | AcaoCampoTestes;

export type AcoesLinha<T> = Partial<Record<AcaoPadrao, (linha: T) => void>>;

// Motivo de uma ação não se aplicar a uma linha (aparece apagada, com o motivo na dica); `undefined` = disponível;
// `null` = a ação nem aparece nesta linha (ex.: Seguir numa campanha já seguida).
export type AcaoIndisponivel<T> = (linha: T, acao: AcaoPadrao) => string | null | undefined;

// Ações numa coluna própria (só o ícone, nome no cabeçalho e na dica), antes da coluna Ações e fora dela. Seguir e
// Deixar de seguir dividem a mesma coluna: em cada linha só uma aparece (a outra é `null` em AcaoIndisponivel).
export interface ColunaAcao {
  rotulo: string;
  acoes: AcaoPadrao[];
}

const CLASSE_CENTRALIZADA = 'crud-tabela__celula--centralizada';
const CLASSE_COLUNA_ACOES = CLASSE_CENTRALIZADA + ' crud-tabela__col--acoes';
const CLASSE_COLUNA_PROPRIA = CLASSE_CENTRALIZADA + ' crud-tabela__col--acao-propria';

export function CabecalhoAcoes({ coluna }: { coluna?: ColunaAcao }) {
  return <th className={coluna ? CLASSE_CENTRALIZADA : CLASSE_COLUNA_ACOES}>{coluna?.rotulo ?? 'Ações'}</th>;
}

interface CelulaAcoesProps<T> {
  acoes: AcoesLinha<T>;
  linha: T;
  indisponivel?: AcaoIndisponivel<T>;
  // Com `coluna`: só as ações dela. Sem: a coluna Ações, com as que não estão em `emColuna`.
  coluna?: ColunaAcao;
  emColuna?: AcaoPadrao[];
}

export function CelulaAcoes<T>({ acoes, linha, indisponivel, coluna, emColuna }: CelulaAcoesProps<T>) {
  const mostra = (acao: AcaoPadrao) => (coluna ? coluna.acoes.includes(acao) : !emColuna?.includes(acao));
  return (
    <td className={coluna ? CLASSE_COLUNA_PROPRIA : CLASSE_COLUNA_ACOES}>
      <div className="crud-tabela__acoes">
        {[...ACOES_SISTEMA, ...ACOES_CAMPO_TESTES].filter(({ acao }) => mostra(acao)).map(({ acao, ...visual }) => {
          const aoClicar = acoes[acao];
          const motivo = indisponivel?.(linha, acao);
          return (
            aoClicar &&
            motivo !== null && (
              <AcaoLinha key={acao} {...visual} soIcone={Boolean(coluna)} onClick={() => aoClicar(linha)} indisponivel={motivo} />
            )
          );
        })}
      </div>
    </td>
  );
}
