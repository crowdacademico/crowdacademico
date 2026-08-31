import { useCallback } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { tipoLinkApi } from '../../services/9-tipo-link/api/tipo-link.api';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';

// Aba (futura) "Tipos de Link" do painel admin — rota /admin/tipos-link.
// Já registrada em rotas.constants.js e funcional por URL direta, só
// ainda sem rotuloMenu/grupoMenu ativos (o Lucas não decidiu em que grupo
// do menu lateral ela entra) — ver comentário lá pra ativar depois. Mesmo
// padrão de ListarAreasConhecimento (8-area-conhecimento).
export function ListarTiposLink({ auth }) {
  const listarTipos = useCallback(() => tipoLinkApi.listar(auth.authFetch), [auth.authFetch]);
  // 'tipo_link' é o nome FÍSICO da tabela (bate com
  // trg_log_auditoria_tipo_link, 05_regras_negocio.sql), não o nome da
  // rota — mesma convenção de buscarLogAreas/buscarLogConfiguracoes.
  const buscarLogTipos = useCallback(
    (pagina) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'tipo_link', pagina),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Tipos de Link"
        acaoTopo={
          <Link to="/admin/tipos-link/criar" className="btn btn-primary">
            Criar
          </Link>
        }
        // `largura: '9.25rem'` nas 4 booleanas (19-08-2026, pedido do
        // Lucas: "o exato mesmo espaçamento") — sem isso, cada uma tinha
        // uma largura diferente (table-layout: auto mede pela palavra do
        // cabeçalho, e "Atualização"/"Recompensa" são bem mais compridas
        // que "Perfil"/"Ativo"). 9.25rem é a medida real da mais larga
        // ("Atualização", ~9.1rem) com uma folga pequena. Os 3 escopos
        // (CK_TIPO_LINK_ALGUM_ESCOPO — pelo menos 1 sempre TRUE) viram
        // badge Sim/Não sozinhos, mesmo tratamento que GenericTable já dá
        // pra qualquer coluna booleana — não precisou de `renderizar`
        // customizado.
        // Ordem "id, nome, ..." (25-08-2026, pedido do Lucas: padronizar
        // com as outras tabelas — código só trocou de lugar com nome,
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
        rotaBase="/admin/tipos-link"
        buscarLog={buscarLogTipos}
        campoRenomeioLog="nome"
      />
    </div>
  );
}
