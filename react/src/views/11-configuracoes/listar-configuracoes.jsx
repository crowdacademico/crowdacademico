import { useCallback } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';
import { logAuditoriaApi } from '../../services/28-log-auditoria/api/log-auditoria.api';

// Aba "Configurações" do painel admin — rota /admin/configuracoes.
export function ListarConfiguracoes({ auth }) {
  const listarConfiguracoes = useCallback(
    () => configuracaoApi.listar(auth.authFetch),
    [auth.authFetch],
  );
  // 'configuracoes' é o nome FÍSICO da tabela (plural, bate com o CREATE
  // TABLE em 01_extensoes_enums_tabelas.sql), não o nome da rota.
  const buscarLogConfiguracoes = useCallback(
    () => logAuditoriaApi.listarPorTabela(auth.authFetch, 'configuracoes'),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Configurações"
        acaoTopo={
          <Link to="/configuracoes/criar" className="btn btn-primary">
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
        rotaBase="/configuracoes"
        buscarLog={buscarLogConfiguracoes}
      />
    </div>
  );
}
