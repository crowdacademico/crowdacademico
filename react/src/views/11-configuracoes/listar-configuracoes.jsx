import { useCallback } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { configuracaoApi } from '../../services/11-configuracoes/api/configuracao.api';

// Aba "Configurações" do painel admin — rota /admin/configuracoes.
export function ListarConfiguracoes({ auth }) {
  const listarConfiguracoes = useCallback(
    () => configuracaoApi.listar(auth.authFetch),
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
      />
    </div>
  );
}
