import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

const MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATA = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' });

export function formatarMoeda(valor: number) {
  return MOEDA.format(valor);
}

export function formatarData(valor: string | null) {
  return valor ? DATA.format(new Date(valor)) : 'Não informado';
}

export function percentualArrecadado(campanha: Pick<CampanhaResponse, 'metaFinanceira' | 'valorBrutoArrecadado'>) {
  return campanha.metaFinanceira > 0
    ? Math.round((campanha.valorBrutoArrecadado / campanha.metaFinanceira) * 100)
    : null;
}
