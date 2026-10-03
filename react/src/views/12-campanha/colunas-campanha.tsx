import { BadgeStatusCampanha } from '../../components/crud/badge-status-campanha';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

// Células das listas de campanha (Campanhas e Minhas Campanhas), para as duas ficarem iguais: status em etiqueta
// colorida (a mesma do Consultar). A ordenação e a busca continuam pelo valor da linha (o rótulo do status), como
// em qualquer coluna. A barra de quanto da meta já foi atingido mora no Consultar: na lista, deixava a linha alta.
export const renderizarStatus = (linha: { statusOriginal: CampanhaResponse['status']; dataInicio: CampanhaResponse['dataInicio'] }) => (
  <BadgeStatusCampanha campanha={{ status: linha.statusOriginal, dataInicio: linha.dataInicio }} />
);
