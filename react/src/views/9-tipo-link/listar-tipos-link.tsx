import { useCallback } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { BotaoCriar } from '../../components/crud/botao-criar';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';
import { ModalCriarTipoLink } from './modal-criar-tipo-link';
import { ModalAlterarTipoLink, ModalConsultarTipoLink, ModalExcluirTipoLink } from './modal-tipo-link';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';

// Aba "Tipos de Link" do painel admin: rota /admin/tipos-link. Criar/Alterar/Consultar/Excluir em modal, mesmo
// padrão de listar-usuarios.tsx/listar-motivos-denuncia.tsx.
export function ListarTiposLink({ auth }: PropsPagina) {
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
  } = useCrudModais<TipoLinkResponse>();

  const listarTipos = useCallback(
    () => tipoLinkApi.listar(auth.authFetch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.authFetch, chaveRecarga],
  );
  // 'tipo_link' é o nome FÍSICO da tabela (bate com
  // trg_log_auditoria_tipo_link, 05_regras_negocio.sql), não o nome da
  // rota - mesma convenção de buscarLogAreas/buscarLogConfiguracoes.
  const buscarLogTipos = useCallback(
    (pagina: number, tamanho: number) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'tipo_link', pagina, tamanho),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable<TipoLinkResponse>
        titulo="Tipos de Link"
        acaoTopo={
          <BotaoCriar aoClicar={abrirCriando} />
        }
        // Ordem "id, nome, ...": padroniza com as outras tabelas (mesmo padrão de Áreas do Conhecimento).
        colunas={[
          { chave: 'idTipolink', rotulo: 'id', tipo: 'id' },
          { chave: 'nome', rotulo: 'nome', tipo: 'nome' },
          { chave: 'codigo', rotulo: 'código', tipo: 'texto' },
          { chave: 'permitePerfil', rotulo: 'perfil', tipo: 'simNao' },
          { chave: 'permiteAtualizacao', rotulo: 'atualização', tipo: 'simNao' },
          { chave: 'permiteRecompensa', rotulo: 'recompensa', tipo: 'simNao' },
          { chave: 'ativo', rotulo: 'ativo', tipo: 'simNao' },
        ]}
        chavePrimaria="idTipolink"
        listar={listarTipos}
        acoes={acoesCompletas}
      />
      <BlocoLogAuditoria buscar={buscarLogTipos} />

      {criando && (
        <ModalCriarTipoLink auth={auth} aoFechar={fecharCriando} aoCriado={recarregar} />
      )}

      {alterando && (
        <ModalAlterarTipoLink
          auth={auth}
          tipo={alterando}
          aoFechar={fecharAlterando}
          aoAtualizado={recarregar}
        />
      )}

      {consultando && (
        <ModalConsultarTipoLink tipo={consultando} aoFechar={fecharConsultando} />
      )}

      {excluindo && (
        <ModalExcluirTipoLink
          auth={auth}
          tipo={excluindo}
          aoFechar={fecharExcluindo}
          aoExcluido={recarregar}
        />
      )}
    </div>
  );
}
