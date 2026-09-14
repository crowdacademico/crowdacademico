import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import { ModalAlterarTermoUso } from './modal-alterar-termo-uso';
import { ModalExcluirTermoUso } from './modal-excluir-termo-uso';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { ROTULO_TIPO_TERMO, TIPOS_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos';
import { formatarDataHora } from '../../services/constant/utils/formatacao.util';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { TermoUsoResponse } from '../../services/5-termo-uso/type/termo-uso.type';

// Criar/Listar/Consultar/Alterar/Excluir (13-09-2026, EM MODAL - pedido do
// Lucas: "vamos acabar com as telas próprias e adotar modal para o CRUD",
// mesmo padrão de Usuário/Pesquisadores). `conteudo` não vira coluna (texto
// integral, longo demais pra tabela) - Consultar abre no MESMO ModalDetalhe
// já usado por Permissões; Alterar abre ModalAlterarTermoUso (o mesmo
// componente que o card de Regras do Negócio usa).
//
// Ordem das colunas (mesmo dia, rodada seguinte, pedido do Lucas):
// "versão" trocou de lugar com "tipo" - versão é o identificador visível
// (mesmo papel de "nome" nas outras tabelas), então vem logo depois do id,
// igual ao padrão (id, nome, ..., Ações) de todo o resto do painel. "tipo"/
// "ativo"/"publicado em" ficaram centralizados (cabeçalho e célula juntos).
//
// Excluir (mesmo dia) - só rascunho nunca vigente e nunca aceito por
// ninguém (TermoUsoServiceExcluir bloqueia o resto com 409/403).
//
// Filtro por tipo (mesmo dia) - "Todos" marcado por padrão (mesmo padrão do
// facet de Papel em Usuários), com rótulo amigável no dropdown.
export function ListarTermosUso({ auth }: PropsPagina) {
  const [termoDetalhado, setTermoDetalhado] = useState<TermoUsoResponse | null>(null);
  const [termoAlterando, setTermoAlterando] = useState<TermoUsoResponse | null>(null);
  const [termoExcluindo, setTermoExcluindo] = useState<TermoUsoResponse | null>(null);
  // `chaveRecarga` força o `useEffect([listar])` interno de GenericTable a
  // buscar de novo depois que ModalAlterarTermoUso/ModalExcluirTermoUso
  // salva/exclui (mesmo padrão de listar-usuarios.tsx - GenericTable não
  // expõe "recarregar" próprio).
  const [chaveRecarga, setChaveRecarga] = useState(0);
  const listarTermos = useCallback(
    () => termoUsoApi.listar(auth.authFetch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.authFetch, chaveRecarga],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable<TermoUsoResponse>
        titulo="Termos de Uso"
        acaoTopo={
          <Link to="/admin/termos-uso/criar" className="btn btn-primary">
            Criar
          </Link>
        }
        colunas={[
          { chave: 'idTermo', rotulo: 'id' },
          { chave: 'versao', rotulo: 'versão' },
          {
            chave: 'tipo',
            rotulo: 'tipo',
            centralizar: true,
            renderizar: (linha) => ROTULO_TIPO_TERMO[linha.tipo],
          },
          { chave: 'ativo', rotulo: 'ativo' },
          {
            chave: 'criadoEm',
            rotulo: 'publicado em',
            centralizar: true,
            renderizar: (linha) => formatarDataHora(linha.criadoEm),
          },
        ]}
        chavePrimaria="idTermo"
        listar={listarTermos}
        // Filtro por tipo (13-09-2026, pedido do Lucas: "assim como
        // USUARIOS", marcado Todos por padrão) - `rotulos` traduz o valor
        // cru do enum pro rótulo amigável só na exibição do dropdown.
        filtrosFacetados={[
          { chave: 'tipo', rotulo: 'Tipo', ordem: TIPOS_TERMO, rotulos: ROTULO_TIPO_TERMO },
        ]}
        acoes={['alterar', 'consultar', 'excluir']}
        aoAlterar={(linha) => setTermoAlterando(linha)}
        aoConsultar={(linha) => setTermoDetalhado(linha)}
        aoExcluir={(linha) => setTermoExcluindo(linha)}
      />

      {termoDetalhado && (
        <ModalDetalhe
          titulo={`Termos de Uso ${termoDetalhado.versao} (${ROTULO_TIPO_TERMO[termoDetalhado.tipo]})`}
          chave={termoDetalhado.ativo ? 'Versão ativa' : 'Versão histórica (substituída)'}
          aoFechar={() => setTermoDetalhado(null)}
          secoes={[
            {
              titulo: 'Texto completo',
              conteudo: <div className="whitespace-pre-wrap">{termoDetalhado.conteudo}</div>,
            },
          ]}
        />
      )}

      {termoAlterando && (
        <ModalAlterarTermoUso
          auth={auth}
          tipo={termoAlterando.tipo}
          idTermoInicial={termoAlterando.idTermo}
          aoFechar={() => setTermoAlterando(null)}
          aoSalvar={() => setChaveRecarga((atual) => atual + 1)}
        />
      )}

      {termoExcluindo && (
        <ModalExcluirTermoUso
          auth={auth}
          termo={termoExcluindo}
          aoFechar={() => setTermoExcluindo(null)}
          aoExcluido={() => setChaveRecarga((atual) => atual + 1)}
        />
      )}
    </div>
  );
}
