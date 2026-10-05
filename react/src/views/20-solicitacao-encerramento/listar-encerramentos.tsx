import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { BadgeStatusEncerramento } from '../../components/crud/badge-status-encerramento';
import { ROTULO_MODELO_CAMPANHA } from '../../services/12-campanha/constants/status-campanha.constants';
import { solicitacaoEncerramentoApi } from '../../services/20-solicitacao-encerramento/api/solicitacao-encerramento.api';
import {
  ORDEM_STATUS_ENCERRAMENTO,
  ROTULO_STATUS_ENCERRAMENTO,
} from '../../services/20-solicitacao-encerramento/constants/status-encerramento.constants';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';
import { ModalDecidirEncerramento } from './modal-decidir-encerramento';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { SolicitacaoEncerramentoResponse } from '../../services/20-solicitacao-encerramento/type/solicitacao-encerramento.type';

interface PedidoLinha extends Omit<SolicitacaoEncerramentoResponse, 'status'> {
  status: string;
  statusOriginal: SolicitacaoEncerramentoResponse['status'];
  campanha: string;
  pesquisador: string;
  modelo: string;
}

// Encerramentos (moderação): os pedidos de encerramento antecipado (RF-065), com pesquisador, campanha, modelo,
// arrecadado, contribuições confirmadas e situação; os pendentes pedem decisão. Alterar abre o pedido pendente para
// aprovar (encerra a campanha) ou rejeitar (com justificativa); Consultar abre qualquer pedido só para ler.
export function ListarEncerramentos({ auth }: PropsPagina) {
  const [aberto, setAberto] = useState<{ pedido: SolicitacaoEncerramentoResponse; somenteLeitura: boolean } | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);

  const listar = useCallback(async (): Promise<PedidoLinha[]> => {
    const pedidos = await solicitacaoEncerramentoApi.listar(auth.authFetch);
    return pedidos.map((pedido) => ({
      ...pedido,
      status: ROTULO_STATUS_ENCERRAMENTO[pedido.status],
      statusOriginal: pedido.status,
      campanha: `#${pedido.idCampanha} ${pedido.tituloCampanha ?? ''}`,
      pesquisador: pedido.nomePesquisador ?? '-',
      modelo: pedido.modeloCampanha ? ROTULO_MODELO_CAMPANHA[pedido.modeloCampanha] : '-',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, chaveRecarga]);

  const buscarLog = useCallback(
    (pagina: number, tamanho: number) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'solicitacao_encerramento', pagina, tamanho),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Encerramentos"
        ajuda="Pedidos de pesquisadores para encerrar uma campanha antes do prazo. Aprovar encerra a campanha; rejeitar exige justificativa e a campanha segue ativa."
        colunas={[
          { chave: 'idSolicitacao', rotulo: 'id', tipo: 'id' },
          { chave: 'campanha', rotulo: 'campanha', tipo: 'nome', umaLinha: true },
          { chave: 'pesquisador', rotulo: 'pesquisador', tipo: 'texto' },
          { chave: 'modelo', rotulo: 'modelo', tipo: 'status' },
          { chave: 'valorArrecadado', rotulo: 'arrecadado', tipo: 'dinheiro' },
          { chave: 'contribuicoesConfirmadas', rotulo: 'contribuições', tipo: 'numero' },
          { chave: 'solicitadoEm', rotulo: 'pedido em', tipo: 'data' },
          {
            chave: 'status',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha: PedidoLinha) => <BadgeStatusEncerramento status={linha.statusOriginal} />,
          },
        ]}
        vazio={{ icone: 'fa-flag-checkered', titulo: 'Nenhum pedido de encerramento.', texto: 'Quando um pesquisador pedir para encerrar uma campanha antes do prazo, o pedido aparece aqui.' }}
        chavePrimaria="idSolicitacao"
        listar={listar}
        acoes={{
          alterar: (linha) => setAberto({ pedido: { ...linha, status: linha.statusOriginal }, somenteLeitura: false }),
          consultar: (linha) => setAberto({ pedido: { ...linha, status: linha.statusOriginal }, somenteLeitura: true }),
        }}
        acaoIndisponivel={(linha, acao) =>
          acao === 'alterar' && linha.statusOriginal !== 'pendente' ? 'Este pedido já foi decidido ou cancelado.' : undefined
        }
        filtrosFacetados={[
          { chave: 'status', rotulo: 'Situação', ordem: ORDEM_STATUS_ENCERRAMENTO.map((status) => ROTULO_STATUS_ENCERRAMENTO[status]) },
          { chave: 'modelo', rotulo: 'Modelo' },
        ]}
      />
      <BlocoLogAuditoria buscar={buscarLog} />

      {aberto && (
        <ModalDecidirEncerramento
          authFetch={auth.authFetch}
          pedido={aberto.pedido}
          somenteLeitura={aberto.somenteLeitura}
          aoFechar={() => setAberto(null)}
          aoDecidido={() => setChaveRecarga((atual) => atual + 1)}
        />
      )}
    </div>
  );
}
