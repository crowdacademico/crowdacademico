import { useCallback } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';
import { ModalCriarMotivoDenuncia } from './modal-criar-motivo-denuncia';
import {
  ModalAlterarMotivoDenuncia,
  ModalConsultarMotivoDenuncia,
  ModalExcluirMotivoDenuncia,
} from './modal-motivo-denuncia';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { MotivoDenunciaResponse } from '../../services/10-motivo-denuncia/type/motivo-denuncia.type';

// Ordem fixa do filtro por faceta abaixo (campanha antes de perfil) - os
// 2 únicos valores de tipo_motivo_denuncia (01_extensoes_enums_tabelas.sql),
// mesma ideia de ORDEM_PODER_PAPEL em listar-usuarios.tsx.
const ORDEM_TIPO = ['campanha', 'perfil'];

// Aba "Motivos de Denúncia" do painel admin - rota /admin/motivos-denuncia.
//
// EM MODAL (14-09-2026, continuação da migração CRUD→Modal pedida pelo
// Lucas) - Criar/Alterar/Consultar/Excluir deixaram de ser páginas
// próprias (removidas de rotas.constants.ts) e viraram os modais de
// modal-motivo-denuncia.tsx/modal-criar-motivo-denuncia.tsx, mesmo padrão
// de listar-usuarios.tsx.
export function ListarMotivosDenuncia({ auth }: PropsPagina) {
  const {
    criando,
    abrirCriando,
    fecharCriando,
    alterando,
    consultando,
    excluindo,
    fecharAlterando,
    fecharConsultando,
    fecharExcluindo,
    chaveRecarga,
    recarregar,
    acoesCompletas,
  } = useCrudModais<MotivoDenunciaResponse>();

  const listarMotivos = useCallback(
    () => motivoDenunciaApi.listar(auth.authFetch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.authFetch, chaveRecarga],
  );
  // 'motivo_denuncia' é o nome FÍSICO da tabela (bate com
  // trg_log_auditoria_motivo_denuncia, 05_regras_negocio.sql), não o nome
  // da rota - mesma convenção de buscarLogTipos/buscarLogAreas.
  const buscarLogMotivos = useCallback(
    (pagina: number) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'motivo_denuncia', pagina),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable<MotivoDenunciaResponse>
        titulo="Motivos de Denúncia"
        acaoTopo={
          <button type="button" className="btn btn-primary" onClick={abrirCriando}>
            Criar
          </button>
        }
        colunas={[
          { chave: 'idMotivo', rotulo: 'id' },
          { chave: 'descricao', rotulo: 'descrição' },
          { chave: 'tipo', rotulo: 'tipo' },
          { chave: 'ativo', rotulo: 'ativo' },
        ]}
        chavePrimaria="idMotivo"
        listar={listarMotivos}
        acoes={acoesCompletas}
        // Filtro por faceta (campanha/perfil) - pensado pro caso de uso
        // concreto de achar rápido, entre os ~12 motivos seedados, só os
        // de um tipo (mesma ideia do filtro de papel em ListarUsuarios).
        filtrosFacetados={[{ chave: 'tipo', rotulo: 'Tipo', ordem: ORDEM_TIPO }]}
      />
      <BlocoLogAuditoria buscar={buscarLogMotivos} campoRenomeio="descricao" />

      {criando && (
        <ModalCriarMotivoDenuncia auth={auth} aoFechar={fecharCriando} aoCriado={recarregar} />
      )}

      {alterando && (
        <ModalAlterarMotivoDenuncia
          auth={auth}
          motivo={alterando}
          aoFechar={fecharAlterando}
          aoAtualizado={recarregar}
        />
      )}

      {consultando && (
        <ModalConsultarMotivoDenuncia motivo={consultando} aoFechar={fecharConsultando} />
      )}

      {excluindo && (
        <ModalExcluirMotivoDenuncia
          auth={auth}
          motivo={excluindo}
          aoFechar={fecharExcluindo}
          aoExcluido={recarregar}
        />
      )}
    </div>
  );
}
