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
        // largura igual nas 4 (25-08-2026, pedido do Lucas: mesma ideia de
        // Tipos de Link/Pesquisadores — "status"/"pesquisador"/"meta"/
        // "arrecadado" ficando cada um com um tamanho, "arrecadado" nem
        // tinha `centralizar` (inconsistência real com "meta", ao lado).
        // 10rem (não 8rem como em Pesquisadores) porque "status" aqui tem
        // valor bem mais longo que um badge normal (ex.: "Encerrado
        // (moderação)", 22 caracteres) — ainda pode quebrar em 2 linhas
        // nesse caso raro (nenhum white-space:nowrap forçado), só não
        // pede uma coluna gigante à toa pros valores curtos, que são a
        // maioria.
        // "título" também ganhou `largura` própria (18rem, ACHADO do
        // Lucas: sem largura nenhuma, virou a ÚNICA coluna "livre" da
        // tabela — absorvia sozinha TODO o espaço sobrando, já que as
        // outras 4 agora são fixas, mesmo problema que "nome"/"papel" já
        // tinham em Usuários antes de darmos largura fixa às vizinhas).
        // Diferente das 4 acima, sem `centralizar` — é a coluna principal
        // de texto (o "nome" desta tabela), fica alinhada à esquerda.
        // Texto quebra livremente dentro dos 18rem (nenhum nowrap
        // forçado, igual qualquer outra coluna de texto) — título de
        // campanha comprido agora ganha 2-3 linhas em vez de esticar a
        // coluna.
        colunas={[
          { chave: 'idCampanha', rotulo: 'id' },
          { chave: 'titulo', rotulo: 'título', largura: '28rem' },
          { chave: 'status', rotulo: 'status', centralizar: true, largura: '10rem' },
          { chave: 'pesquisador', rotulo: 'pesquisador', centralizar: true, largura: '10rem' },
          { chave: 'metaFinanceira', rotulo: 'meta', centralizar: true, largura: '10rem' },
          { chave: 'valorBrutoArrecadado', rotulo: 'arrecadado', centralizar: true, largura: '10rem' },
        ]}
        chavePrimaria="idCampanha"
        listar={listarCampanhas}
        rotaBase="/admin/campanhas"
        acoes={['consultar']}
        // "Área" (25-08-2026, pedido do Lucas: "tabela muito poluída") saiu
        // das colunas visíveis e virou filtro — o dado (`linha.area`)
        // continua vindo de listarCampanhas normalmente, filtro por faceta
        // não depende da coluna existir na tabela, só do campo existir na
        // linha.
        filtrosFacetados={[
          { chave: 'status', rotulo: 'Status', ordem: ORDEM_STATUS_CAMPANHA.map((s) => ROTULO_STATUS_CAMPANHA[s]) },
          { chave: 'area', rotulo: 'Área' },
        ]}
        buscarLog={buscarLogCampanha}
      />
    </div>
  );
}
