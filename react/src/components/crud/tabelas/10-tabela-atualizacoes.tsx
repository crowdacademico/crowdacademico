import { AcaoLinha } from '../acao-linha';
import { BadgeBooleano } from '../badge-booleano';
import { formatarDataHora } from '../../../services/constant/util/formatacao.util';
import {
  ROTULO_FASE_ATUALIZACAO,
  ROTULO_TIPO_ATUALIZACAO,
} from '../../../services/15-atualizacao-campanha/constants/atualizacao-campanha.constants';
import type { AtualizacaoCampanhaResponse } from '../../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';
import { CaixaTabela } from './caixa-tabela';

// Atualizações publicadas numa campanha (título, fase, formato, data, se está visível), com o botão de ocultar ou
// mostrar de novo. Quem busca e faz a alteração é a tela que usa a tabela.
interface TabelaAtualizacoesProps {
  atualizacoes: AtualizacaoCampanhaResponse[];
  // Sem ele (quem só lê), a coluna Ações não aparece.
  aoAlternarAtivo?: (atualizacao: AtualizacaoCampanhaResponse) => void;
}

export function TabelaAtualizacoes({ atualizacoes, aoAlternarAtivo }: TabelaAtualizacoesProps) {
  return (
    <CaixaTabela rotulo="Atualizações da campanha">
      <table className="crud-tabela">
        <thead>
          <tr>
            <th>Título</th>
            <th>Fase</th>
            <th>Formato</th>
            <th>Publicada em</th>
            <th className="crud-tabela__celula--centralizada">Visível</th>
            {aoAlternarAtivo && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {atualizacoes.map((item) => (
            <tr key={item.idAtualizacao}>
              <td>{item.titulo}</td>
              <td>{ROTULO_FASE_ATUALIZACAO[item.fase]}</td>
              <td>{ROTULO_TIPO_ATUALIZACAO[item.tipo]}</td>
              <td>{formatarDataHora(item.publicadoEm)}</td>
              <td className="crud-tabela__celula--centralizada">
                <BadgeBooleano valor={item.ativo} />
              </td>
              {aoAlternarAtivo && (
                <td>
                  <AcaoLinha
                    rotulo={item.ativo ? 'Ocultar' : 'Mostrar'}
                    icone={item.ativo ? 'fa-eye-slash' : 'fa-eye'}
                    onClick={() => aoAlternarAtivo(item)}
                  />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </CaixaTabela>
  );
}
