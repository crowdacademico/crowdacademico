import type { ReactNode } from 'react';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { formatarMoeda } from '../../services/constant/util/formatacao.util';
import { celulaArrecadado } from './colunas-campanha';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';
import type { ResumoContribuicoes } from '../../services/22-contribuicao/type/contribuicao.type';

interface SecaoFinanceiroCampanhaProps {
  campanha: CampanhaResponse;
  // A meta que vale agora: a do formulário no Alterar (a barra do arrecadado acompanha), a gravada no Consultar.
  meta: number;
  // No Alterar, enquanto a campanha não foi aprovada, a meta é um campo; sem isto, ela só se lê.
  campoMeta?: ReactNode;
  // null = ainda carregando ou sem permissão para ver: o campo mostra "-" e continua no lugar.
  resumoContribuicoes: ResumoContribuicoes | null;
}

// O Financeiro de uma campanha, igual no Consultar e no Alterar: uma linha só, de ponta a ponta (DS-116), na ordem do
// dinheiro: quanto entrou, contra a meta, a taxa e o que sobra para o pesquisador; por último, de quantas contribuições.
export function SecaoFinanceiroCampanha({ campanha, meta, campoMeta, resumoContribuicoes }: SecaoFinanceiroCampanhaProps) {
  return (
    <SecaoFicha titulo="Financeiro" centralizada>
      {/* A mesma célula da coluna "arrecadado" das tabelas (DS-105): a barra fina colada embaixo do número, na largura
          dele, mostrando quanto da meta já foi atingido. */}
      <CampoFicha rotulo="Arrecadado" valor={celulaArrecadado(campanha.valorBrutoArrecadado, meta)} />
      {campoMeta ?? <CampoFicha rotulo="Meta" valor={formatarMoeda(meta)} />}
      <CampoFicha
        rotulo="Taxa"
        valor={campanha.taxaPlataforma === null ? 'Ainda não carimbada (não aprovada)' : `${campanha.taxaPlataforma}%`}
      />
      {/* RF-087: o que o pesquisador receberia hoje, pela mesma conta do repasse (taxa mínima incluída); antes da
          aprovação, com a taxa padrão. */}
      <CampoFicha rotulo="Líquido estimado" valor={formatarMoeda(campanha.valorLiquidoEstimado)} />
      <CampoFicha
        rotulo="Contribuições"
        valor={
          resumoContribuicoes &&
          (resumoContribuicoes.total === 0 ? 'Nenhuma ainda.' : `${resumoContribuicoes.pagas} pagas de ${resumoContribuicoes.total}`)
        }
      />
    </SecaoFicha>
  );
}
