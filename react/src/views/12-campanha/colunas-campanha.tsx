import { classeBadgeStatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

// Células das listas de campanha (Campanhas e Minhas Campanhas), para as duas ficarem iguais: status em etiqueta
// colorida (a mesma do Consultar). A ordenação e a busca continuam pelo valor da linha (o rótulo do status), como
// em qualquer coluna. A barra de quanto da meta já foi atingido mora no Consultar: na lista, deixava a linha alta.
export const renderizarStatus = (linha: { status: string; statusOriginal: CampanhaResponse['status'] }) => (
  <span className={`badge ${classeBadgeStatusCampanha(linha.statusOriginal)}`}>{linha.status}</span>
);
