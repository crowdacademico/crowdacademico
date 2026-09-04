import { useCallback } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';

// Aba "Parâmetros do Sistema" do painel admin - rota /admin/configuracoes
// (URL/tabela/variáveis internas continuam "configuracoes" de propósito,
// só o nome visível na tela mudou, 11-08-2026 - ver rotas.constants.js).
export function ListarConfiguracoes({ auth }) {
  const listarConfiguracoes = useCallback(
    () => configuracaoApi.listar(auth.authFetch),
    [auth.authFetch],
  );
  // 'configuracoes' é o nome FÍSICO da tabela (plural, bate com o CREATE
  // TABLE em 01_extensoes_enums_tabelas.sql), não o nome da rota.
  const buscarLogConfiguracoes = useCallback(
    (pagina) => logAuditoriaApi.listarPorTabela(auth.authFetch, 'configuracoes', pagina),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Parâmetros do Sistema"
        acaoTopo={
          <Link to="/admin/configuracoes/criar" className="btn btn-primary">
            Criar
          </Link>
        }
        colunas={[
          { chave: 'idConfig', rotulo: 'id' },
          { chave: 'chave', rotulo: 'chave' },
          { chave: 'valor', rotulo: 'valor' },
          { chave: 'tipo', rotulo: 'tipo' },
          { chave: 'ativo', rotulo: 'ativo' },
        ]}
        chavePrimaria="idConfig"
        listar={listarConfiguracoes}
        rotaBase="/admin/configuracoes"
        buscarLog={buscarLogConfiguracoes}
        // "De"/"Para" no VALOR (09-08-2026, pedido do Lucas) - é a coluna
        // que mais importa aqui: configuracoes existe pra tirar regra de
        // negócio hardcoded do .sql, então ver o valor antigo/novo de uma
        // mudança (ex.: taxa, limite, prazo) é mais útil que "chave"/
        // "descricao"/"ativo" mudaram.
        campoRenomeioLog="valor"
      />
    </div>
  );
}
