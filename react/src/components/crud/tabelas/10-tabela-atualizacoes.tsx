import { CabecalhoAcoes, CelulaAcoes } from '../colunas/5-coluna-acoes';
import { ListaAnexos } from '../lista-anexos';
import { formatarData } from '../../../services/constant/util/formatacao.util';
import {
  ROTULO_FASE_ATUALIZACAO,
  rotuloSituacaoAtualizacao,
} from '../../../services/15-atualizacao-campanha/constants/atualizacao-campanha.constants';
import type { AtualizacaoCampanhaResponse } from '../../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';
import { CaixaTabela } from './caixa-tabela';

// Atualizações publicadas numa campanha (título, fase, anexos, data e situação; o formato sai dos anexos, cujo ícone
// diz se é PDF, imagem ou link), com Alterar e Excluir para o dono, na coluna Ações padrão (a mesma da GenericTable).
// Quem busca e faz a alteração é a tela que usa a tabela.
interface TabelaAtualizacoesProps {
  atualizacoes: AtualizacaoCampanhaResponse[];
  // Só o dono passa: sem eles, a coluna Ações não aparece e a situação diz "pelo pesquisador".
  aoAlterar?: (atualizacao: AtualizacaoCampanhaResponse) => void;
  aoExcluir?: (atualizacao: AtualizacaoCampanhaResponse) => void;
}

export function TabelaAtualizacoes({ atualizacoes, aoAlterar, aoExcluir }: TabelaAtualizacoesProps) {
  const doDono = Boolean(aoExcluir);
  return (
    <CaixaTabela rotulo="Atualizações da campanha">
      <table className="crud-tabela">
        <thead>
          <tr>
            <th>Título</th>
            <th className="crud-tabela__col--curta">Fase</th>
            <th>Anexos</th>
            <th className="crud-tabela__col--curta">Publicada em</th>
            <th className="crud-tabela__col--curta">Situação</th>
            {doDono && <CabecalhoAcoes />}
          </tr>
        </thead>
        <tbody>
          {atualizacoes.map((item) => (
            <tr key={item.idAtualizacao}>
              <td>{item.titulo}</td>
              <td className="crud-tabela__col--curta">{ROTULO_FASE_ATUALIZACAO[item.fase]}</td>
              <td>
                <ListaAnexos anexos={item.anexos} />
              </td>
              <td className="crud-tabela__col--curta">{formatarData(item.publicadoEm)}</td>
              <td className="crud-tabela__col--curta">
                <span className={'badge ' + (item.ativo ? 'badge-sucesso' : item.ocultadaModeracao ? 'badge-erro' : 'badge-neutro')}>
                  {rotuloSituacaoAtualizacao(item, doDono)}
                </span>
              </td>
              {doDono && (
                <CelulaAcoes
                  acoes={{ ...(aoAlterar ? { alterar: aoAlterar } : {}), excluir: aoExcluir }}
                  linha={item}
                  // O dono sempre exclui mantendo o registro: a que já saiu do ar não exclui de novo.
                  indisponivel={(linha, acao) =>
                    acao === 'excluir' && !linha.ativo
                      ? linha.ocultadaModeracao
                        ? 'Excluída pela moderação.'
                        : 'Já excluída: o registro fica guardado.'
                      : undefined
                  }
                />
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </CaixaTabela>
  );
}
