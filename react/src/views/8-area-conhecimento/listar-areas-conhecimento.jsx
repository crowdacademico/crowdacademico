import { useCallback } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';

// Aba (futura) "Áreas do Conhecimento" do painel admin — rota
// /admin/areas-conhecimento. Já registrada em rotas.constants.js e
// funcional por URL direta, só ainda sem rotuloMenu/grupoMenu ativos (o
// Lucas não decidiu em que grupo do menu lateral ela entra) — ver
// comentário lá pra ativar depois.
export function ListarAreasConhecimento({ auth }) {
  const listarAreas = useCallback(
    () => areaConhecimentoApi.listar(auth.authFetch),
    [auth.authFetch],
  );
  // 'area_conhecimento' é o nome FÍSICO da tabela (bate com
  // trg_log_auditoria_area_conhecimento, 05_regras_negocio.sql), não o
  // nome da rota — mesma convenção de buscarLogConfiguracoes/
  // buscarLogUsuario.
  const buscarLogAreas = useCallback(
    (pagina) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'area_conhecimento', pagina),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Áreas do Conhecimento"
        acaoTopo={
          <Link to="/admin/areas-conhecimento/criar" className="btn btn-primary">
            Criar
          </Link>
        }
        colunas={[
          { chave: 'idAreaConhecimento', rotulo: 'id' },
          { chave: 'codigoCnpq', rotulo: 'código CNPq' },
          { chave: 'nome', rotulo: 'nome' },
          { chave: 'nomePai', rotulo: 'grande área' },
          { chave: 'ativo', rotulo: 'ativo' },
        ]}
        chavePrimaria="idAreaConhecimento"
        listar={listarAreas}
        rotaBase="/admin/areas-conhecimento"
        // Sem 'excluir': backend não tem DELETE pra area_conhecimento (só
        // INSERT/UPDATE concedidos em 06_grants.sql) — só desativa via
        // Alterar (campo "Ativo").
        acoes={['alterar', 'consultar']}
        buscarLog={buscarLogAreas}
        campoRenomeioLog="nome"
        // Escolher uma grande área no filtro mostra só as áreas filhas
        // dela — as próprias grandes áreas somem da lista filtrada porque
        // não têm `nomePai` (ver GenericTable: linha sem valor pra
        // faceta escolhida é excluída quando alguma seleção está ativa).
        // Só aparece se houver mais de 1 valor possível.
        filtrosFacetados={[{ chave: 'nomePai', rotulo: 'Grande área' }]}
      />
    </div>
  );
}
