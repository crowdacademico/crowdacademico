import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { BadgeStatusDenuncia } from '../../components/crud/badge-status-denuncia';
import { denunciaApi } from '../../services/19-denuncia/api/denuncia.api';
import {
  ORDEM_STATUS_DENUNCIA,
  ROTULO_STATUS_CONTESTACAO,
  ROTULO_STATUS_DENUNCIA,
  ROTULO_TIPO_DENUNCIA,
  STATUS_DENUNCIA_DECIDIDA,
} from '../../services/19-denuncia/constants/status-denuncia.constants';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';
import { ModalJulgarDenuncia } from './modal-julgar-denuncia';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { DenunciaResponse } from '../../services/19-denuncia/type/denuncia.type';

interface DenunciaLinha extends Omit<DenunciaResponse, 'status'> {
  status: string;
  statusOriginal: DenunciaResponse['status'];
  tipo: string;
  alvo: string;
  // Desde quando a denúncia espera julgamento; vazio depois de julgada.
  esperandoDesde: string | null;
  contestacaoSituacao: string;
}

// Denúncias (moderação): campanhas e perfis denunciados, com motivo, há quanto tempo esperam julgamento e situação (RF-113,
// RF-116). Alterar abre o julgamento (RF-111) e, para campanha ativa, o encerramento por moderação (RF-114);
// Consultar abre a mesma ficha só para ler.
export function ListarDenuncias({ auth }: PropsPagina) {
  const [aberta, setAberta] = useState<{ denuncia: DenunciaResponse; somenteLeitura: boolean } | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);

  const listar = useCallback(async (): Promise<DenunciaLinha[]> => {
    const denuncias = await denunciaApi.listar(auth.authFetch);
    // Fila: primeiro as que esperam julgamento, a mais antiga no topo (como em Aprovar Campanhas); depois as já
    // julgadas, a mais nova primeiro.
    const decidida = (denuncia: DenunciaResponse) => STATUS_DENUNCIA_DECIDIDA.has(denuncia.status);
    const ordenadas = [...denuncias].sort((a, b) =>
      decidida(a) !== decidida(b)
        ? Number(decidida(a)) - Number(decidida(b))
        : decidida(a)
          ? b.criadoEm.localeCompare(a.criadoEm)
          : a.criadoEm.localeCompare(b.criadoEm),
    );
    return ordenadas.map((denuncia) => ({
      ...denuncia,
      status: ROTULO_STATUS_DENUNCIA[denuncia.status],
      statusOriginal: denuncia.status,
      tipo: ROTULO_TIPO_DENUNCIA[denuncia.tipoMotivo],
      alvo:
        denuncia.idCampanhaAlvo !== null
          ? `#${denuncia.idCampanhaAlvo} ${denuncia.tituloCampanha ?? ''}`
          : `#${denuncia.idPesquisadorAlvo} ${denuncia.nomePesquisadorAlvo ?? ''}`,
      esperandoDesde: STATUS_DENUNCIA_DECIDIDA.has(denuncia.status) ? null : denuncia.criadoEm,
      contestacaoSituacao: denuncia.contestacaoStatus ? ROTULO_STATUS_CONTESTACAO[denuncia.contestacaoStatus] : '-',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, chaveRecarga]);

  const buscarLog = useCallback(
    (pagina: number, tamanho: number) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'denuncia', pagina, tamanho),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Denúncias"
        ajuda="Campanhas e perfis de pesquisador denunciados. Alterar abre a denúncia para julgar, e Consultar só para ler; numa campanha ativa, a decisão pode encerrá-la por moderação. Uma contestação do pesquisador esperando análise é decidida no mesmo lugar."
        colunas={[
          { chave: 'idDenuncia', rotulo: 'id', tipo: 'id' },
          { chave: 'tipo', rotulo: 'tipo', tipo: 'status' },
          { chave: 'alvo', rotulo: 'alvo', tipo: 'nome', umaLinha: true },
          { chave: 'motivo', rotulo: 'motivo', tipo: 'texto' },
          { chave: 'esperandoDesde', rotulo: 'esperando', tipo: 'espera' },
          {
            chave: 'status',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha: DenunciaLinha) => <BadgeStatusDenuncia status={linha.statusOriginal} />,
          },
          { chave: 'contestacaoSituacao', rotulo: 'contestação', tipo: 'status' },
        ]}
        vazio={{ icone: 'fa-flag', titulo: 'Nenhuma denúncia registrada.', texto: 'Quando alguém denunciar uma campanha ou um perfil, a denúncia aparece aqui para julgar.' }}
        chavePrimaria="idDenuncia"
        listar={listar}
        acoes={{
          alterar: (linha) => setAberta({ denuncia: { ...linha, status: linha.statusOriginal }, somenteLeitura: false }),
          consultar: (linha) => setAberta({ denuncia: { ...linha, status: linha.statusOriginal }, somenteLeitura: true }),
        }}
        filtrosFacetados={[
          { chave: 'status', rotulo: 'Situação', ordem: ORDEM_STATUS_DENUNCIA.map((status) => ROTULO_STATUS_DENUNCIA[status]) },
          { chave: 'tipo', rotulo: 'Tipo' },
          { chave: 'contestacaoSituacao', rotulo: 'Contestação' },
        ]}
      />
      <BlocoLogAuditoria buscar={buscarLog} />

      {aberta && (
        <ModalJulgarDenuncia
          authFetch={auth.authFetch}
          denuncia={aberta.denuncia}
          somenteLeitura={aberta.somenteLeitura}
          aoFechar={() => setAberta(null)}
          aoJulgada={() => setChaveRecarga((atual) => atual + 1)}
        />
      )}
    </div>
  );
}
