import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { BlocoLogAuditoria } from '../../components/crud/bloco-log-auditoria';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import { logAuditoriaApi } from '../../services/27-log-auditoria/api/log-auditoria.api';
import { ModalCriarTipoLink } from './modal-criar-tipo-link';
import { ModalAlterarTipoLink, ModalConsultarTipoLink, ModalExcluirTipoLink } from './modal-tipo-link';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { TipoLinkResponse } from '../../services/9-tipo-link/type/tipo-link.type';

// Aba "Tipos de Link" do painel admin - rota /admin/tipos-link.
//
// EM MODAL (14-09-2026, continuação da migração CRUD→Modal pedida pelo
// Lucas) - mesmo padrão de listar-usuarios.tsx/listar-motivos-denuncia.tsx.
export function ListarTiposLink({ auth }: PropsPagina) {
  const [criando, setCriando] = useState(false);
  const [alterando, setAlterando] = useState<TipoLinkResponse | null>(null);
  const [consultando, setConsultando] = useState<TipoLinkResponse | null>(null);
  const [excluindo, setExcluindo] = useState<TipoLinkResponse | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const recarregar = () => setChaveRecarga((atual) => atual + 1);

  const listarTipos = useCallback(
    () => tipoLinkApi.listar(auth.authFetch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.authFetch, chaveRecarga],
  );
  // 'tipo_link' é o nome FÍSICO da tabela (bate com
  // trg_log_auditoria_tipo_link, 05_regras_negocio.sql), não o nome da
  // rota - mesma convenção de buscarLogAreas/buscarLogConfiguracoes.
  const buscarLogTipos = useCallback(
    (pagina: number) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'tipo_link', pagina),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable<TipoLinkResponse>
        titulo="Tipos de Link"
        acaoTopo={
          <button type="button" className="btn btn-primary" onClick={() => setCriando(true)}>
            Criar
          </button>
        }
        // `largura: '9.25rem'` nas 4 booleanas (19-08-2026, pedido do
        // Lucas: "o exato mesmo espaçamento") - sem isso, cada uma tinha
        // uma largura diferente (table-layout: auto mede pela palavra do
        // cabeçalho, e "Atualização"/"Recompensa" são bem mais compridas
        // que "Perfil"/"Ativo"). 9.25rem é a medida real da mais larga
        // ("Atualização", ~9.1rem) com uma folga pequena. Os 3 escopos
        // (CK_TIPO_LINK_ALGUM_ESCOPO - pelo menos 1 sempre TRUE) viram
        // badge Sim/Não sozinhos, mesmo tratamento que GenericTable já dá
        // pra qualquer coluna booleana - não precisou de `renderizar`
        // customizado.
        // Ordem "id, nome, ..." (25-08-2026, pedido do Lucas: padronizar
        // com as outras tabelas - código só trocou de lugar com nome,
        // nenhum dado mudou, mesma mudança já feita em Áreas do
        // Conhecimento).
        colunas={[
          { chave: 'idTipolink', rotulo: 'id' },
          { chave: 'nome', rotulo: 'nome' },
          { chave: 'codigo', rotulo: 'código' },
          { chave: 'permitePerfil', rotulo: 'perfil', largura: '9.25rem' },
          { chave: 'permiteAtualizacao', rotulo: 'atualização', largura: '9.25rem' },
          { chave: 'permiteRecompensa', rotulo: 'recompensa', largura: '9.25rem' },
          { chave: 'ativo', rotulo: 'ativo', largura: '9.25rem' },
        ]}
        chavePrimaria="idTipolink"
        listar={listarTipos}
        aoAlterar={setAlterando}
        aoConsultar={setConsultando}
        aoExcluir={setExcluindo}
      />
      <BlocoLogAuditoria buscar={buscarLogTipos} campoRenomeio="nome" />

      {criando && (
        <ModalCriarTipoLink auth={auth} aoFechar={() => setCriando(false)} aoCriado={recarregar} />
      )}

      {alterando && (
        <ModalAlterarTipoLink
          auth={auth}
          tipo={alterando}
          aoFechar={() => setAlterando(null)}
          aoAtualizado={recarregar}
        />
      )}

      {consultando && (
        <ModalConsultarTipoLink tipo={consultando} aoFechar={() => setConsultando(null)} />
      )}

      {excluindo && (
        <ModalExcluirTipoLink
          auth={auth}
          tipo={excluindo}
          aoFechar={() => setExcluindo(null)}
          aoExcluido={recarregar}
        />
      )}
    </div>
  );
}
