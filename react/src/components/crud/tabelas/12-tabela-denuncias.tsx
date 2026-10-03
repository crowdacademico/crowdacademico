// Denúncias de uma campanha, só para ler: quando, quem denunciou, o motivo, o relato, a situação e o porquê da
// decisão. Usada no Consultar da campanha (views/19-denuncia/secao-denuncias-campanha.tsx).

import { BadgeStatusDenuncia } from '../badge-status-denuncia';
import { formatarData } from '../../../services/constant/util/formatacao.util';
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
            <th>Data</th>
            <th>Denunciante</th>
            <th>Motivo</th>
            <th>Relato</th>
            <th>Situação</th>
            <th>Decisão</th>
          </tr>
        </thead>
        <tbody>
          {denuncias.map((item) => (
            <tr key={item.idDenuncia}>
              <td className="crud-tabela__col--id">{item.idDenuncia}</td>
              <td>{formatarData(item.criadoEm)}</td>
              <td>{item.nomeDenunciante ?? `#${item.idUsuario}`}</td>
              <td>{item.motivo}</td>
              <td>
                <TextoResumido texto={item.relato} titulo={`Relato da denúncia #${item.idDenuncia}`} />
              </td>
              <td>
                <BadgeStatusDenuncia status={item.status} />
              </td>
              <td>
                <TextoResumido texto={item.justificativaModeracao} titulo={`Decisão da denúncia #${item.idDenuncia}`} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </CaixaTabela>
  );
}
