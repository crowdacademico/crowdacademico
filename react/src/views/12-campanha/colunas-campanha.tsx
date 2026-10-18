import { BadgeStatusCampanha } from '../../components/crud/badge-status-campanha';
import { TextoComBarraProgresso } from '../../components/crud/barra-progresso';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { rotuloStatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

// Células das listas de campanha (Campanhas, Minhas Campanhas e as do Campo de Testes), para todas ficarem iguais:
// status em etiqueta colorida (a mesma do Consultar) e arrecadado com a barra de quanto da meta já foi atingido. A
// ordenação e a busca continuam pelo valor da linha, como em qualquer coluna.
// O rótulo que a etiqueta mostra: a tabela mede ele (todas as linhas) para a coluna não mudar ao virar a página.
export const textoStatus = (linha: { statusOriginal: CampanhaResponse['status']; dataInicio: CampanhaResponse['dataInicio'] }) =>
  rotuloStatusCampanha({ status: linha.statusOriginal, dataInicio: linha.dataInicio });

// Arrecadado com a barra fina embaixo (mesma barra do Consultar, sem aumentar a linha nem a coluna: DS-105). A parte
// genérica recebe o valor e a meta, para servir a qualquer tabela que mostre o arrecadado de uma campanha (ex.: Pedidos
// de Encerramento); sem um dos dois, só "-".
export const celulaArrecadado = (arrecadado: number | null, meta: number | null) =>
  arrecadado === null || meta === null ? (
    '-'
  ) : (
    <TextoComBarraProgresso texto={formatarMoeda(arrecadado)} valor={arrecadado} total={meta} rotulo="Arrecadado em relação à meta" />
  );

export const renderizarArrecadado = (linha: Pick<CampanhaResponse, 'valorBrutoArrecadado' | 'metaFinanceira'>) =>
  celulaArrecadado(linha.valorBrutoArrecadado, linha.metaFinanceira);

export const renderizarStatus = (linha: { statusOriginal: CampanhaResponse['status']; dataInicio: CampanhaResponse['dataInicio'] }) => (
  <BadgeStatusCampanha campanha={{ status: linha.statusOriginal, dataInicio: linha.dataInicio }} />
);
