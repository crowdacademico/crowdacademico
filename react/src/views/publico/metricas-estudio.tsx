import { useCallback } from 'react';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import { contribuicaoApi } from '../../services/22-contribuicao/api/contribuicao.api';
import { contaRecebimentoApi } from '../../services/24-conta-recebimento/api/conta-recebimento.api';
import type { RepasseResponse } from '../../services/24-conta-recebimento/type/conta-recebimento.type';
import type { AuthFetch } from '../../services/3-auth/type/auth.type';
import { useBuscar } from '../../services/constant/hook/use-buscar';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';

// Campanha que já foi ao ar (as outras não arrecadam).
const PUBLICADA: ReadonlySet<CampanhaResponse['status']> = new Set(['ativo', 'sucesso', 'nao_atingido', 'encerrado', 'encerrado_moderacao']);

interface Metricas {
  apoios: number;
  liquidoEstimado: number;
  recebido: number;
  previsto: number;
}

// As métricas do Estúdio (RF-090 e RF-091, 16-11-2026): o quanto as campanhas arrecadaram, quantos apoios pagos
// receberam, quanto o pesquisador deve receber (estimado, já sem a taxa da plataforma) e o que já foi repassado ou está
// previsto. O valor líquido estimado vem do banco, campanha por campanha (GET /campanha/:id, a mesma conta do repasse);
// o React não refaz a regra da taxa. Campanha com repasse concluído conta no "já recebido", não no estimado.
async function buscarMetricas(authFetch: AuthFetch, campanhas: CampanhaResponse[]): Promise<Metricas> {
  const [recebidas, repasses] = await Promise.all([
    contribuicaoApi.recebidas(authFetch).catch(() => []),
    contaRecebimentoApi.listarRepasses(authFetch).catch(() => [] as RepasseResponse[]),
  ]);
  const repassadas = new Set(repasses.filter((r) => r.status === 'concluido').map((r) => r.idCampanha));
  const comDinheiro = campanhas.filter(
    (c) => PUBLICADA.has(c.status) && c.valorBrutoArrecadado > 0 && !repassadas.has(c.idCampanha),
  );
  const detalhes = await Promise.all(comDinheiro.map((c) => campanhaApi.buscar(authFetch, c.idCampanha).catch(() => null)));
  return {
    apoios: recebidas.length,
    liquidoEstimado: detalhes.reduce((total, d) => total + (d?.valorLiquidoEstimado ?? 0), 0),
    recebido: repasses.filter((r) => r.status === 'concluido').reduce((total, r) => total + r.valorLiquido, 0),
    previsto: repasses
      .filter((r) => r.status === 'pendente' || r.status === 'processando')
      .reduce((total, r) => total + r.valorLiquido, 0),
  };
}

// O ícone fica na linha do rótulo (não ao lado do valor), para o valor usar a largura toda do cartão: com o ícone ao
// lado, "R$ 6.555,55" já vazava do cartão.
function Cartao({ icone, rotulo, valor, detalhe }: { icone: string; rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="fundo-cartao border borda-padrao rounded-xl p-4 min-w-0">
      <p className="legenda texto-fraco flex items-center gap-2 mb-2">
        <span className="w-7 h-7 shrink-0 rounded-lg fundo-sutil texto-marca flex items-center justify-center" aria-hidden="true">
          <i className={`fa-solid ${icone}`} />
        </span>
        {rotulo}
      </p>
      <p className="numero numero--kpi texto-forte whitespace-nowrap">{valor}</p>
      {detalhe && <p className="legenda texto-fraco mt-1">{detalhe}</p>}
    </div>
  );
}

export function MetricasEstudio({ authFetch, campanhas }: { authFetch: AuthFetch; campanhas: CampanhaResponse[] }) {
  const buscar = useCallback(() => buscarMetricas(authFetch, campanhas), [authFetch, campanhas]);
  const { dado } = useBuscar(buscar, [buscar]);
  const publicadas = campanhas.filter((c) => PUBLICADA.has(c.status));
  const arrecadado = publicadas.reduce((total, c) => total + c.valorBrutoArrecadado, 0);
  const carregando = dado === null;

  return (
    <section aria-label="Resumo das suas campanhas" className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3 mb-6">
      <Cartao icone="fa-sack-dollar" rotulo="Arrecadado" valor={formatarMoeda(arrecadado)} />
      <Cartao icone="fa-hand-holding-heart" rotulo="Apoios recebidos" valor={carregando ? '…' : String(dado.apoios)} detalhe="pagos" />
      <Cartao icone="fa-calculator" rotulo="Líquido (estimado)" valor={carregando ? '…' : formatarMoeda(dado.liquidoEstimado)} />
      <Cartao
        icone="fa-building-columns"
        rotulo="Repasses recebidos"
        valor={carregando ? '…' : formatarMoeda(dado.recebido)}
        detalhe={carregando ? undefined : dado.previsto > 0 ? `previsto: ${formatarMoeda(dado.previsto)}` : 'nada previsto agora'}
      />
    </section>
  );
}
