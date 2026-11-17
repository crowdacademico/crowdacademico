// Denúncias de uma campanha, só para ler: quando, quem denunciou, o motivo, o relato, a situação e o porquê da
// decisão. Usada no Consultar da campanha (views/19-denuncia/secao-denuncias-campanha.tsx).

import { BadgeStatusDenuncia } from '../badge-status-denuncia';
import { formatarData } from '../../../services/constant/util/formatacao.util';
import { situacaoDenuncia } from '../../../services/19-denuncia/constants/status-denuncia.constants';
import type { DenunciaResponse } from '../../../services/19-denuncia/type/denuncia.type';
import { CaixaTabela } from './caixa-tabela';
import { TextoResumido } from '../texto-resumido';

export function TabelaDenuncias({ denuncias }: { denuncias: DenunciaResponse[] }) {
  return (
    <CaixaTabela rotulo="Denúncias da campanha">
      <table className="crud-tabela">
        <thead>
          <tr>
            <th className="crud-tabela__col--id">id</th>
            <th className="crud-tabela__col--curta">Data</th>
            <th className="crud-tabela__col--texto">Denunciante</th>
            <th className="crud-tabela__col--texto">Motivo</th>
            <th>Detalhes adicionais</th>
            <th className="crud-tabela__col--curta">Situação</th>
            <th>Decisão</th>
          </tr>
        </thead>
        <tbody>
          {denuncias.map((item) => (
            <tr key={item.idDenuncia}>
              <td data-rotulo="id" className="crud-tabela__col--id">{item.idDenuncia}</td>
              <td data-rotulo="Data" className="crud-tabela__col--curta">{formatarData(item.criadoEm)}</td>
              <td data-rotulo="Denunciante" className="crud-tabela__col--texto">{item.nomeDenunciante ?? `#${item.idUsuario}`}</td>
              <td data-rotulo="Motivo" className="crud-tabela__col--texto">{item.motivo}</td>
              <td data-rotulo="Detalhes adicionais">
                <TextoResumido texto={item.relato} />
              </td>
              <td data-rotulo="Situação">
                <BadgeStatusDenuncia status={situacaoDenuncia(item)} />
              </td>
              <td data-rotulo="Decisão">
                <TextoResumido texto={item.justificativaModeracao} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CaixaTabela>
  );
}
