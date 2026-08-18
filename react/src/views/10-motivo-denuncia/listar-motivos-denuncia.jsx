import { useCallback } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { motivoDenunciaApi } from '../../services/10-motivo-denuncia/api/motivo-denuncia.api';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';

// Ordem fixa do filtro por faceta abaixo (campanha antes de perfil) — os
// 2 únicos valores de tipo_motivo_denuncia (01_extensoes_enums_tabelas.sql),
// mesma ideia de ORDEM_PODER_PAPEL em listar-usuarios.jsx.
const ORDEM_TIPO = ['campanha', 'perfil'];

// Futura aba "Motivos de Denúncia" do painel admin — rota
// /admin/motivos-denuncia. Já registrada em rotas.constants.js e
// funcional por URL direta, só ainda sem rotuloMenu/grupoMenu ativos (o
// Lucas não decidiu em que grupo do menu lateral ela entra — talvez junto
// de Áreas do Conhecimento/Tipos de Link em CADASTROS, talvez dentro de
// um futuro grupo MODERAÇÃO ao lado de "Denúncias" quando o módulo
// 19-denuncia existir) — ver comentário em rotas.constants.js pra ativar
// depois. Mesmo padrão de ListarTiposLink/ListarAreasConhecimento.
export function ListarMotivosDenuncia({ auth }) {
  const listarMotivos = useCallback(
    () => motivoDenunciaApi.listar(auth.authFetch),
    [auth.authFetch],
  );
  // 'motivo_denuncia' é o nome FÍSICO da tabela (bate com
  // trg_log_auditoria_motivo_denuncia, 05_regras_negocio.sql), não o nome
  // da rota — mesma convenção de buscarLogTipos/buscarLogAreas.
  const buscarLogMotivos = useCallback(
    (pagina) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'motivo_denuncia', pagina),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Motivos de Denúncia"
        acaoTopo={
          <Link to="/admin/motivos-denuncia/criar" className="btn btn-primary">
            Criar
          </Link>
        }
        colunas={[
          { chave: 'idMotivo', rotulo: 'id' },
          { chave: 'codigo', rotulo: 'código' },
          { chave: 'descricao', rotulo: 'descrição' },
          { chave: 'tipo', rotulo: 'tipo' },
          { chave: 'ativo', rotulo: 'ativo' },
        ]}
        chavePrimaria="idMotivo"
        listar={listarMotivos}
        rotaBase="/admin/motivos-denuncia"
        // Sem 'excluir': backend não tem DELETE pra motivo_denuncia (só
        // INSERT/UPDATE concedidos em 06_grants.sql [06-C-1]) — só
        // desativa via Alterar (campo "Ativo"). Mesmo padrão de
        // ListarTiposLink.
        acoes={['alterar', 'consultar']}
        // Filtro por faceta (campanha/perfil) — pensado pro caso de uso
        // concreto de achar rápido, entre os ~12 motivos seedados, só os
        // de um tipo (mesma ideia do filtro de papel em ListarUsuarios).
        filtrosFacetados={[{ chave: 'tipo', rotulo: 'Tipo', ordem: ORDEM_TIPO }]}
        buscarLog={buscarLogMotivos}
        campoRenomeioLog="descricao"
      />
    </div>
  );
}
