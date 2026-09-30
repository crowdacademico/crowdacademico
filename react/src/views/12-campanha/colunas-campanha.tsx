import { classeBadgeStatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import { CelulaArrecadacao } from './celula-arrecadacao';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

// Células das listas de campanha (Campanhas e Minhas Campanhas), para as duas ficarem iguais: status em etiqueta
// colorida (a mesma do Consultar) e arrecadado com a barra de quanto da meta já foi atingido. A ordenação e a
// busca continuam pelo valor da linha (o rótulo do status, o valor em reais), como em qualquer coluna.
export const renderizarStatus = (linha: { status: string; statusOriginal: CampanhaResponse['status'] }) => (
  <span className={`badge ${classeBadgeStatusCampanha(linha.statusOriginal)}`}>{linha.status}</span>
);

export const renderizarArrecadado = (linha: { valorBrutoArrecadado: number; metaFinanceira: number }) => (
  <CelulaArrecadacao arrecadado={linha.valorBrutoArrecadado} meta={linha.metaFinanceira} />
);
