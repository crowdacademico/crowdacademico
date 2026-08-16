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
        colunas={[
          { chave: 'idTipolink', rotulo: 'id' },
          { chave: 'codigo', rotulo: 'código' },
          { chave: 'nome', rotulo: 'nome' },
          // Os 3 escopos (CK_TIPO_LINK_ALGUM_ESCOPO — pelo menos 1
          // sempre TRUE) viram badge Sim/Não sozinhos, mesmo tratamento
          // que GenericTable já dá pra qualquer coluna booleana — não
          // precisou de `renderizar` customizado.
          { chave: 'permitePerfil', rotulo: 'perfil' },
          { chave: 'permiteAtualizacao', rotulo: 'atualização' },
          { chave: 'permiteRecompensa', rotulo: 'recompensa' },
          { chave: 'ativo', rotulo: 'ativo' },
        ]}
        chavePrimaria="idTipolink"
        listar={listarTipos}
        rotaBase="/admin/tipos-link"
        // Sem 'excluir': backend não tem DELETE pra tipo_link (só
        // INSERT/UPDATE concedidos em 06_grants.sql [06-C-2]) — só
        // desativa via Alterar (campo "Ativo").
        acoes={['alterar', 'consultar']}
        buscarLog={buscarLogTipos}
        campoRenomeioLog="nome"
      />
    </div>
  );
}
