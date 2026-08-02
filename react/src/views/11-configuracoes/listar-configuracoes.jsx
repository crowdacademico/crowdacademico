import { useCallback } from 'react';
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
        colunas={[
          { chave: 'idConfig', rotulo: 'id' },
          { chave: 'chave', rotulo: 'chave' },
          { chave: 'valor', rotulo: 'valor', editavel: true },
          { chave: 'tipo', rotulo: 'tipo' },
          { chave: 'ativo', rotulo: 'ativo' },
        ]}
        chavePrimaria="idConfig"
        campoRotulo="chave"
        listar={listarConfiguracoes}
        criar={(dados) => configuracaoApi.criar(auth.authFetch, dados)}
        camposCriar={[
          { chave: 'chave', rotulo: 'Chave' },
          { chave: 'valor', rotulo: 'Valor' },
          {
            chave: 'tipo',
            rotulo: 'Tipo',
            tipo: 'select',
            // Mesmo conjunto fechado de CREATE TYPE tipo_configuracao (01_extensoes_enums_tabelas.sql)
            opcoes: [
              { valor: 'decimal', rotulo: 'Decimal' },
              { valor: 'inteiro', rotulo: 'Inteiro' },
              { valor: 'texto', rotulo: 'Texto' },
              { valor: 'booleano', rotulo: 'Booleano' },
            ],
          },
          { chave: 'descricao', rotulo: 'Descrição' },
        ]}
        atualizar={(id, dados) => configuracaoApi.atualizar(auth.authFetch, id, dados)}
        remover={(id) => configuracaoApi.remover(auth.authFetch, id)}
      />
    </div>
  );
}
