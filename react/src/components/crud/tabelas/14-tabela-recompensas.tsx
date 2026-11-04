import { AcaoLinha } from '../acao-linha';
import { CabecalhoAcoes, CelulaAcoesLivre } from '../colunas/5-coluna-acoes';
import { formatarMoeda } from '../../../services/constant/util/formatacao.util';
import { ROTULO_TIPO_RECOMPENSA } from '../../../services/18-recompensa/constants/recompensa.constants';
import type { RecompensaResponse } from '../../../services/18-recompensa/type/recompensa.type';
import { CaixaTabela } from './caixa-tabela';

// Recompensas de uma campanha (título, tipo, valor mínimo, quantas vezes foi escolhida, link e situação; a descrição fica
// no Alterar, para a tabela caber no modal), com Alterar e Desativar/Reativar para o dono, na coluna Ações padrão. Quem
// busca e faz a alteração é a tela que usa a tabela. Para quem só lê, as colunas de escolhidas, link e situação não aparecem (o banco não mostra a eles).
interface TabelaRecompensasProps {
  recompensas: RecompensaResponse[];
  aoAlterar?: (recompensa: RecompensaResponse) => void;
  aoAlternarAtivo?: (recompensa: RecompensaResponse) => void;
}

export function TabelaRecompensas({ recompensas, aoAlterar, aoAlternarAtivo }: TabelaRecompensasProps) {
  const doDono = Boolean(aoAlterar);
  return (
    <CaixaTabela rotulo="Recompensas da campanha">
      <table className="crud-tabela">
        <thead>
          <tr>
            <th>Título</th>
            <th className="crud-tabela__col--curta">Tipo</th>
            <th className="crud-tabela__col--curta">A partir de</th>
            {doDono && <th className="crud-tabela__col--curta">Escolhida</th>}
            {doDono && <th className="crud-tabela__col--curta">Link</th>}
            {doDono && <th className="crud-tabela__col--curta">Situação</th>}
            {doDono && <CabecalhoAcoes />}
          </tr>
        </thead>
        <tbody>
          {recompensas.map((item) => (
            <tr key={item.idRecompensa}>
              <td>{item.titulo}</td>
              <td className="crud-tabela__col--curta">{ROTULO_TIPO_RECOMPENSA[item.tipo]}</td>
              <td className="crud-tabela__col--curta">{formatarMoeda(item.valorMinimo)}</td>
              {doDono && <td className="crud-tabela__col--curta">{item.escolhidas}</td>}
              {doDono && (
                <td className="crud-tabela__col--curta">
                  {item.links[0] ? (
                    <a href={item.links[0].url} target="_blank" rel="noreferrer" className="link-texto">
                      <i className="fa-solid fa-link" aria-hidden="true"></i> Abrir
                    </a>
                  ) : (
                    '-'
                  )}
                </td>
              )}
              {doDono && (
                <td className="crud-tabela__col--curta">
                  <span className={'badge ' + (item.ativo ? 'badge-sucesso' : 'badge-neutro')}>{item.ativo ? 'Ativa' : 'Desativada'}</span>
                </td>
              )}
              {doDono && (
                <CelulaAcoesLivre>
                  <AcaoLinha rotulo="Alterar" icone="fa-pen" variante="alterar" onClick={() => aoAlterar?.(item)} />
                  <AcaoLinha
                    rotulo={item.ativo ? 'Desativar' : 'Reativar'}
                    icone={item.ativo ? 'fa-ban' : 'fa-rotate-left'}
                    variante={item.ativo ? 'aviso' : 'alterar'}
                    onClick={() => aoAlternarAtivo?.(item)}
                  />
                </CelulaAcoesLivre>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </CaixaTabela>
  );
}
