import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { ORDEM_ROTULOS_STATUS_CAMPANHA, rotuloStatusCampanha } from '../../services/12-campanha/constants/status-campanha.constants';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';
import { ModalConsultarCampanha } from './modal-consultar-campanha';
import { renderizarStatus } from './colunas-campanha';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

interface CampanhaLinha extends Omit<CampanhaResponse, 'status'> {
  status: string;
  statusOriginal: CampanhaResponse['status'];
  pesquisador: string;
  area: string;
}

// Aba "Campanhas" do painel admin: rota /admin/campanhas. Sem Alterar/Excluir aqui: os campos editáveis
// dependem do status (congelados depois de aprovada) e a aprovação/rejeição têm regras próprias (fila de
// aprovação, aprovar-campanhas.tsx). Por isso só listar + consultar (em modal); criar é em Minhas Campanhas
// e aprovar é na fila.
export function ListarCampanhas({ auth }: PropsPagina) {
  const [consultandoId, setConsultandoId] = useState<number | null>(null);

  // Nome do pesquisador e da área vêm prontos do backend (a tela não baixa o catálogo inteiro de usuários e de
  // áreas só para resolver dois nomes). Se a RLS esconder o usuário, cai no id. O sinal de score baixo
  // ("atenção") fica só na fila de aprovação (aprovar-campanhas.tsx), onde a decisão acontece.
  const listarCampanhas = useCallback(async (): Promise<CampanhaLinha[]> => {
    const campanhas = await campanhaApi.listar(auth.authFetch);

    return campanhas.map((campanha) => ({
      ...campanha,
      status: rotuloStatusCampanha(campanha),
      statusOriginal: campanha.status,
      pesquisador: campanha.nomePesquisador ?? `#${campanha.idUsuario}`,
      area: campanha.nomeArea ?? `#${campanha.idAreaConhecimento}`,
    }));
  }, [auth.authFetch]);

  const buscarLogCampanha = useCallback(
    (pagina: number, tamanho: number) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'campanha', pagina, tamanho),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Campanhas"
        ajuda="Acompanhe todas as campanhas da plataforma, em qualquer status."
        colunas={[
          { chave: 'idCampanha', rotulo: 'id', tipo: 'id' },
          { chave: 'titulo', rotulo: 'título', tipo: 'nome', umaLinha: true },
          { chave: 'status', rotulo: 'status', tipo: 'status', renderizar: renderizarStatus },
          { chave: 'pesquisador', rotulo: 'pesquisador', tipo: 'texto' },
          { chave: 'metaFinanceira', rotulo: 'meta', tipo: 'dinheiro' },
          { chave: 'valorBrutoArrecadado', rotulo: 'arrecadado', tipo: 'dinheiro' },
        ]}
        vazio={{ icone: 'fa-bullhorn', titulo: 'Nenhuma campanha na plataforma ainda.' }}
        chavePrimaria="idCampanha"
        listar={listarCampanhas}
        acoes={{ consultar: (linha) => setConsultandoId(linha.idCampanha) }}
        // "Área" é filtro, não coluna visível (a tabela ficava poluída): o dado (`linha.area`) continua vindo
        // de listarCampanhas, e o filtro por faceta não depende da coluna existir na tabela, só do campo
        // existir na linha.
        filtrosFacetados={[
          { chave: 'status', rotulo: 'Status', ordem: ORDEM_ROTULOS_STATUS_CAMPANHA },
          { chave: 'area', rotulo: 'Área' },
        ]}
      />
      <BlocoLogAuditoria buscar={buscarLogCampanha} />

      {consultandoId !== null && (
        <ModalConsultarCampanha
          auth={auth}
          idCampanha={consultandoId}
          aoFechar={() => setConsultandoId(null)}
        />
      )}
    </div>
  );
}
