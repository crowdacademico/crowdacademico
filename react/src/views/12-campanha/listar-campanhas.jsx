import { useCallback } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import {
  ORDEM_STATUS_CAMPANHA,
  ROTULO_STATUS_CAMPANHA,
} from '../../services/12-campanha/constants/status-campanha.constants';
import { areaConhecimentoApi } from '../../services/8-area-conhecimento/api/area-conhecimento.api';
import { usuarioApi } from '../../services/1-usuario/api/usuario.api';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';

function formatarReais(valor) {
  return Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Aba "Campanhas" do painel admin (23-08-2026, pedido do Lucas: "tipo o
// Menu de Usuários") — vive na rota /admin/campanhas. Sem rotaBase (sem
// Alterar/Excluir): campanha não tem endpoint de exclusão no backend
// (soft-delete via status, não linha removida), e editar campos foge do
// que um formulário genérico deveria fazer aqui — os campos editáveis
// dependem do status (congelados depois de aprovada) e a
// aprovação/rejeição têm regras próprias (ver PROXIMOS_MODULOS.md, Grupo
// 6, "Aprovar Campanhas" — tela dedicada ainda não construída). Por
// enquanto, só listar + consultar; hoje quem precisa criar/aprovar
// campanha de teste usa o Campo de Testes (views/campo-testes).
export function ListarCampanhas({ auth }) {
  // Mesmo padrão de junção client-side de listar-usuarios.jsx (coluna
  // "papel"): busca campanhas + usuários + áreas numa vez só, junta no
  // navegador — os dois `.catch(() => [])` seguem o mesmo espírito:
  // se um catálogo falhar, a tabela continua de pé, só sem aquele nome
  // resolvido (mostra o id cru em vez de travar a tela inteira).
  const listarCampanhas = useCallback(async () => {
    const [campanhas, usuarios, areas] = await Promise.all([
      campanhaApi.listar(auth.authFetch),
      usuarioApi.listar(auth.authFetch).catch(() => []),
      areaConhecimentoApi.listar(auth.authFetch).catch(() => []),
    ]);

    const nomePorIdUsuario = new Map(usuarios.map((usuario) => [usuario.idUsuario, usuario.nome]));
    const nomePorIdArea = new Map(areas.map((area) => [area.idAreaConhecimento, area.nome]));

    return campanhas.map((campanha) => ({
      ...campanha,
      status: ROTULO_STATUS_CAMPANHA[campanha.status] ?? campanha.status,
      pesquisador: nomePorIdUsuario.get(campanha.idUsuario) ?? `#${campanha.idUsuario}`,
      area: nomePorIdArea.get(campanha.idAreaConhecimento) ?? `#${campanha.idAreaConhecimento}`,
      metaFinanceira: formatarReais(campanha.metaFinanceira),
      valorBrutoArrecadado: formatarReais(campanha.valorBrutoArrecadado),
    }));
  }, [auth.authFetch]);

  const buscarLogCampanha = useCallback(
    (pagina) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'campanha', pagina),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Campanhas"
        colunas={[
          { chave: 'idCampanha', rotulo: 'id' },
          { chave: 'titulo', rotulo: 'título' },
          { chave: 'status', rotulo: 'status' },
          { chave: 'pesquisador', rotulo: 'pesquisador' },
          { chave: 'area', rotulo: 'área' },
          { chave: 'metaFinanceira', rotulo: 'meta' },
          { chave: 'valorBrutoArrecadado', rotulo: 'arrecadado' },
        ]}
        chavePrimaria="idCampanha"
        listar={listarCampanhas}
        rotaBase="/admin/campanhas"
        acoes={['consultar']}
        filtrosFacetados={[
          { chave: 'status', rotulo: 'Status', ordem: ORDEM_STATUS_CAMPANHA.map((s) => ROTULO_STATUS_CAMPANHA[s]) },
        ]}
        buscarLog={buscarLogCampanha}
      />
    </div>
  );
}
