import { formatarMoeda } from '../../../services/constant/utils/formatacao.util';
import { avaliarCriteriosEnvio } from '../../../services/12-campanha/util/criterios-envio.util';
import type { CriteriosEnvio } from '../../../services/12-campanha/util/criterios-envio.util';

// Checklist "Pronta para aprovar?" de uma campanha aguardando aprovação: itens de orçamento, soma × meta e marcos
// de cronograma, cada um com OK/Faltando. Só leitura. Usada no Alterar Campanha do Campo de Testes (T2,
// views/campo-testes/bancada-campanha.tsx). A regra mora em services/12-campanha/util/criterios-envio.util.ts.

const badge = (ok: boolean) => <span className={`badge ${ok ? 'badge-sucesso' : 'badge-erro'}`}>{ok ? 'OK' : 'Faltando'}</span>;

export function TabelaCriteriosEnvio(criterios: CriteriosEnvio) {
  const { orcamento, cronograma, metaFinanceira, minimoItensOrcamento, minimoMarcosCronograma } = criterios;
  const { soma, itensOk, metaBatendo, cronogramaOk } = avaliarCriteriosEnvio(criterios);

  return (
    <table className="crud-tabela mb-3">
      <thead>
        <tr>
          <th>Critério</th>
          <th className="crud-tabela__celula--centralizada">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            Orçamento: {orcamento.length} itens (mínimo {minimoItensOrcamento})
          </td>
          <td className="crud-tabela__celula--centralizada">{badge(itensOk)}</td>
        </tr>
        <tr>
          <td>
            Soma × meta: {formatarMoeda(soma)} de {formatarMoeda(metaFinanceira)}
            {!metaBatendo && ` (faltam ${formatarMoeda(Number(metaFinanceira) - soma)})`}
          </td>
          <td className="crud-tabela__celula--centralizada">{badge(metaBatendo)}</td>
        </tr>
        <tr>
          <td>
            Cronograma: {cronograma.length} marcos (mínimo {minimoMarcosCronograma})
          </td>
          <td className="crud-tabela__celula--centralizada">{badge(cronogramaOk)}</td>
        </tr>
      </tbody>
    </table>
  );
}
