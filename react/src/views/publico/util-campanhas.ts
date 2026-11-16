import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import { STATUS_VISIVEL_PUBLICAMENTE } from '../../services/12-campanha/constants/status-campanha.constants';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import type { AtualizacaoCampanhaResponse } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';

const DATA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });
const NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const SUFIXOS_COMPACTOS = [
  { limite: 1_000_000_000_000_000, sufixo: 'Q' },
  { limite: 1_000_000_000_000, sufixo: 'T' },
  { limite: 1_000_000_000, sufixo: 'B' },
  { limite: 1_000_000, sufixo: 'M' },
  { limite: 1_000, sufixo: 'K' },
] as const;

export function formatarNumeroCompacto(valor: number, moeda = false): string {
  const indiceSufixo = SUFIXOS_COMPACTOS.findIndex(({ limite }) => Math.abs(valor) >= limite);
  if (indiceSufixo === -1) {
    return moeda ? formatarMoeda(valor) : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(valor);
  }

  let compacto = SUFIXOS_COMPACTOS[indiceSufixo];
  if (indiceSufixo > 0 && Math.abs(valor / compacto.limite) >= 999.95) {
    compacto = SUFIXOS_COMPACTOS[indiceSufixo - 1];
  }
  const prefixo = moeda ? 'R$ ' : '';
  return `${prefixo}${NUMERO.format(valor / compacto.limite)}${compacto.sufixo}`;
}

export function formatarData(valor: string | null) {
  return valor ? DATA.format(new Date(valor)) : 'Não informado';
}

export function percentualArrecadado(campanha: Pick<CampanhaResponse, 'metaFinanceira' | 'valorBrutoArrecadado'>) {
  return campanha.metaFinanceira > 0
    ? Math.round((campanha.valorBrutoArrecadado / campanha.metaFinanceira) * 100)
    : null;
}

export function diasRestantes(dataFim: string | null): number | null {
  if (!dataFim) return null;
  const instanteFim = Date.parse(dataFim);
  if (!Number.isFinite(instanteFim)) return null;
  return Math.max(0, Math.ceil((instanteFim - Date.now()) / 86_400_000));
}

// RF-061: dias inteiros até o início (arredonda para cima: começa amanhã às 9h = "1 dia").
export function diasAteInicio(dataInicio: string | null): number | null {
  return diasRestantes(dataInicio);
}

// Duração da captação, do início ao fim. Antes de começar, é ela que faz sentido mostrar, não "dias restantes".
export function duracaoEmDias(dataInicio: string | null, dataFim: string | null): number | null {
  if (!dataInicio || !dataFim) return null;
  const inicio = Date.parse(dataInicio);
  const fim = Date.parse(dataFim);
  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return null;
  return Math.max(0, Math.ceil((fim - inicio) / 86_400_000));
}

export function campanhaAceitaApoios(campanha: CampanhaResponse): boolean {
  const agora = Date.now();
  const inicio = campanha.dataInicio ? Date.parse(campanha.dataInicio) : null;
  return (
    campanha.status === 'ativo' &&
    (inicio === null || !(inicio > agora)) &&
    (campanha.dataFim === null || Date.parse(campanha.dataFim) > agora)
  );
}

export function campanhaVisivelNoCatalogo(campanha: CampanhaResponse): boolean {
  if (!STATUS_VISIVEL_PUBLICAMENTE.has(campanha.status)) return false;
  if (campanha.status === 'encerrado' || campanha.status === 'nao_atingido') return false;
  if (campanha.status !== 'sucesso' || campanha.dataFim === null) return true;

  const fim = Date.parse(campanha.dataFim);
  return !Number.isFinite(fim) || fim > Date.now();
}

// Mais recente primeiro, só as publicadas (ativo). Uma regra só para a página da campanha, a página de atualizações
// e as publicações do perfil do pesquisador.
export function ordenarAtualizacoes(lista: AtualizacaoCampanhaResponse[]): AtualizacaoCampanhaResponse[] {
  return lista
    .filter((atualizacao) => atualizacao.ativo)
    .sort((a, b) => Date.parse(b.publicadoEm) - Date.parse(a.publicadoEm));
}
