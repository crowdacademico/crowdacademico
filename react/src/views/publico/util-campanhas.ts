import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import { STATUS_VISIVEL_PUBLICAMENTE } from '../../services/12-campanha/constants/status-campanha.constants';

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });
const NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const SUFIXOS_COMPACTOS = [
  { limite: 1_000_000_000_000_000, sufixo: 'Q' },
  { limite: 1_000_000_000_000, sufixo: 'T' },
  { limite: 1_000_000_000, sufixo: 'B' },
  { limite: 1_000_000, sufixo: 'M' },
  { limite: 1_000, sufixo: 'K' },
] as const;

export function formatarMoeda(valor: number) {
  return MOEDA.format(valor);
}

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
