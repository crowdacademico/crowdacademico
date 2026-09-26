import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import {
  ORDEM_STATUS_CAMPANHA,
  ROTULO_STATUS_CAMPANHA,
} from '../../services/12-campanha/constants/status-campanha.constants';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';
import { formatarMoeda } from '../../services/constant/utils/formatacao.util';
import { ModalConsultarCampanha } from './modal-consultar-campanha';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

interface CampanhaLinha extends Omit<CampanhaResponse, 'status' | 'metaFinanceira' | 'valorBrutoArrecadado'> {
  status: string;
  pesquisador: string;
  area: string;
  atencao: string;
  metaFinanceira: string;
  valorBrutoArrecadado: string;
}

// Aba "Campanhas" do painel admin: rota /admin/campanhas. Sem Alterar/Excluir aqui: os campos editáveis
// dependem do status (congelados depois de aprovada) e a aprovação/rejeição têm regras próprias (fila de
// aprovação, aprovar-campanhas.tsx). Por isso só listar + consultar (em modal); quem precisa criar/aprovar
// campanha de teste usa o Campo de Testes.
export function ListarCampanhas({ auth }: PropsPagina) {
  const [consultandoId, setConsultandoId] = useState<number | null>(null);

  // Nome do pesquisador e da área vêm prontos do backend (a tela não baixa o catálogo inteiro de usuários e de
  // áreas só para resolver dois nomes). Se a RLS esconder o usuário, cai no id. "atenção" só aparece para quem
  // pode aprovar, na fila de aprovação, quando o pesquisador está abaixo do score mínimo (sinal, nunca trava
  // nada).
  const listarCampanhas = useCallback(async (): Promise<CampanhaLinha[]> => {
    const campanhas = await campanhaApi.listar(auth.authFetch);

    return campanhas.map((campanha) => ({
      ...campanha,
      status: ROTULO_STATUS_CAMPANHA[campanha.status],
      pesquisador: campanha.nomePesquisador ?? `#${campanha.idUsuario}`,
      area: campanha.nomeArea ?? `#${campanha.idAreaConhecimento}`,
      atencao: campanha.precisaRevisaoScore ? 'Score baixo' : '',
      metaFinanceira: formatarMoeda(campanha.metaFinanceira),
      valorBrutoArrecadado: formatarMoeda(campanha.valorBrutoArrecadado),
    }));
  }, [auth.authFetch]);

  const buscarLogCampanha = useCallback(
    (pagina: number) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'campanha', pagina),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Campanhas"
        // Largura igual nas 4 colunas curtas (mesma ideia de Tipos de Link/Pesquisadores): sem isso
        // "status"/"pesquisador"/"meta"/"arrecadado" ficariam cada um com um tamanho (e "arrecadado" nem tinha
        // `centralizar`, inconsistência com "meta", ao lado). 10rem (não 8rem como em Pesquisadores) porque
        // "status" aqui tem valor bem mais longo que um badge normal (ex.: "Encerrado (moderação)", 22
        // caracteres): ainda pode quebrar em 2 linhas nesse caso raro (nenhum white-space:nowrap forçado), só
        // não pede uma coluna gigante à toa para os valores curtos, que são a maioria.
        // "título" também tem `largura` própria (18rem): sem largura nenhuma, seria a ÚNICA coluna "livre" da
        // tabela e absorveria sozinha TODO o espaço sobrando, já que as outras 4 são fixas (mesmo problema que
        // "nome"/"papel" tinham em Usuários antes de darmos largura fixa às vizinhas). Sem `centralizar`: é a
        // coluna principal de texto (o "nome" desta tabela), fica alinhada à esquerda. O texto quebra
        // livremente dentro dos 18rem (nenhum nowrap forçado): título de campanha comprido ganha 2-3 linhas em
        // vez de esticar a coluna.
        colunas={[
          { chave: 'idCampanha', rotulo: 'id' },
          { chave: 'titulo', rotulo: 'título', largura: '28rem' },
          { chave: 'status', rotulo: 'status', centralizar: true, largura: '10rem' },
          { chave: 'pesquisador', rotulo: 'pesquisador', centralizar: true, largura: '10rem' },
          { chave: 'atencao', rotulo: 'atenção', centralizar: true, largura: '8rem' },
          { chave: 'metaFinanceira', rotulo: 'meta', centralizar: true, largura: '10rem' },
          { chave: 'valorBrutoArrecadado', rotulo: 'arrecadado', centralizar: true, largura: '10rem' },
        ]}
        chavePrimaria="idCampanha"
        listar={listarCampanhas}
        acoes={{ consultar: (linha) => setConsultandoId(linha.idCampanha) }}
        // "Área" é filtro, não coluna visível (a tabela ficava poluída): o dado (`linha.area`) continua vindo
        // de listarCampanhas, e o filtro por faceta não depende da coluna existir na tabela, só do campo
        // existir na linha.
        filtrosFacetados={[
          { chave: 'status', rotulo: 'Status', ordem: ORDEM_STATUS_CAMPANHA.map((s) => ROTULO_STATUS_CAMPANHA[s]) },
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
