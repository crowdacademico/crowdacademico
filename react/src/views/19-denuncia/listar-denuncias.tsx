import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { BadgeStatusDenuncia } from '../../components/crud/badge-status-denuncia';
import { denunciaApi } from '../../services/19-denuncia/api/denuncia.api';
import {
  ORDEM_STATUS_DENUNCIA,
  ROTULO_STATUS_DENUNCIA,
  ROTULO_TIPO_DENUNCIA,
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
  denunciante: string;
}

// Denúncias (moderação): campanhas e perfis denunciados, com motivo, quem denunciou, data e situação (RF-113,
// RF-116). Consultar abre o julgamento (RF-111) e, para campanha ativa, o encerramento por moderação (RF-114).
export function ListarDenuncias({ auth }: PropsPagina) {
  const [julgando, setJulgando] = useState<DenunciaResponse | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);

  const listar = useCallback(async (): Promise<DenunciaLinha[]> => {
    const denuncias = await denunciaApi.listar(auth.authFetch);
    return denuncias.map((denuncia) => ({
      ...denuncia,
      status: ROTULO_STATUS_DENUNCIA[denuncia.status],
      statusOriginal: denuncia.status,
      tipo: ROTULO_TIPO_DENUNCIA[denuncia.tipoMotivo],
      alvo:
        denuncia.idCampanhaAlvo !== null
          ? `#${denuncia.idCampanhaAlvo} ${denuncia.tituloCampanha ?? ''}`
          : `#${denuncia.idPesquisadorAlvo} ${denuncia.nomePesquisadorAlvo ?? ''}`,
      denunciante: denuncia.nomeDenunciante ?? `#${denuncia.idUsuario}`,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, chaveRecarga]);

  const buscarLog = useCallback(
    (pagina: number) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'denuncia', pagina),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Denúncias"
        ajuda="Campanhas e perfis de pesquisador denunciados. Consultar abre a denúncia para julgar; numa campanha ativa, a decisão pode encerrá-la por moderação."
        colunas={[
          { chave: 'idDenuncia', rotulo: 'id', tipo: 'id' },
          { chave: 'tipo', rotulo: 'tipo', tipo: 'status' },
          { chave: 'alvo', rotulo: 'alvo', tipo: 'nome' },
          { chave: 'motivo', rotulo: 'motivo', tipo: 'texto' },
          { chave: 'denunciante', rotulo: 'denunciante', tipo: 'texto' },
          { chave: 'criadoEm', rotulo: 'data', tipo: 'data' },
          {
            chave: 'status',
            rotulo: 'situação',
            tipo: 'status',
            renderizar: (linha: DenunciaLinha) => <BadgeStatusDenuncia status={linha.statusOriginal} />,
          },
        ]}
        vazio={{ icone: 'fa-flag', titulo: 'Nenhuma denúncia registrada.', texto: 'Quando alguém denunciar uma campanha ou um perfil, a denúncia aparece aqui para julgar.' }}
        chavePrimaria="idDenuncia"
        listar={listar}
        acoes={{ consultar: (linha) => setJulgando(linha as unknown as DenunciaResponse) }}
        filtrosFacetados={[
          { chave: 'status', rotulo: 'Situação', ordem: ORDEM_STATUS_DENUNCIA.map((status) => ROTULO_STATUS_DENUNCIA[status]) },
          { chave: 'tipo', rotulo: 'Tipo' },
        ]}
      />
      <BlocoLogAuditoria buscar={buscarLog} />

      {julgando && (
        <ModalJulgarDenuncia
          authFetch={auth.authFetch}
          denuncia={julgando}
          aoFechar={() => setJulgando(null)}
          aoJulgada={() => setChaveRecarga((atual) => atual + 1)}
        />
      )}
    </div>
  );
}
