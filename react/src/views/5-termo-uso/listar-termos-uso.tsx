import { useCallback } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { ModalAlterarTermoUso } from './modal-alterar-termo-uso';
import { ModalExcluirTermoUso } from './modal-excluir-termo-uso';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { ROTULO_TIPO_TERMO, TIPOS_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos';
import { formatarDataHora } from '../../services/constant/utils/formatacao.util';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { TermoUsoResponse } from '../../services/5-termo-uso/type/termo-uso.type';

// Criar/Listar/Consultar/Alterar/Excluir EM MODAL, mesmo padrão de Usuário/Pesquisadores. `conteudo` não vira
// coluna (texto integral, longo demais para tabela): Consultar abre no MESMO ModalDetalhe já usado por
// Permissões; Alterar abre ModalAlterarTermoUso (o mesmo componente que o card de Regras do Negócio usa).
//
// Ordem das colunas: "versão" é o identificador visível (mesmo papel de "nome" nas outras tabelas), então vem
// logo depois do id, igual ao padrão (id, nome, ..., Ações) de todo o resto do painel.
// "tipo"/"ativo"/"publicado em" ficam centralizados (cabeçalho e célula juntos).
//
// Excluir: só rascunho nunca vigente e nunca aceito por ninguém (TermoUsoServiceExcluir bloqueia o resto com
// 409/403).
//
// Filtro por tipo: "Todos" marcado por padrão (mesmo padrão do facet de Papel em Usuários), com rótulo amigável
// no dropdown.
export function ListarTermosUso({ auth }: PropsPagina) {
  // Nomes padronizados via `useCrudModais`, o mesmo hook das outras telas de listagem.
  const {
    alterando,
    consultando,
    excluindo,
    fecharAlterando,
    fecharConsultando,
    fecharExcluindo,
    chaveRecarga,
    recarregar,
    acoesCompletas,
  } = useCrudModais<TermoUsoResponse>();
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
        // Filtro por tipo (como em USUARIOS, marcado Todos por padrão): `rotulos` traduz o valor cru do enum
        // para o rótulo amigável só na exibição do dropdown.
        filtrosFacetados={[
          { chave: 'tipo', rotulo: 'Tipo', ordem: TIPOS_TERMO, rotulos: ROTULO_TIPO_TERMO },
        ]}
        acoes={acoesCompletas}
      />

      {consultando && (
        <ModalDetalhe
          titulo={`Termos de Uso ${consultando.versao} (${ROTULO_TIPO_TERMO[consultando.tipo]})`}
          chave={consultando.ativo ? 'Versão ativa' : 'Versão histórica (substituída)'}
          aoFechar={fecharConsultando}
          secoes={[
            {
              titulo: 'Texto completo',
              conteudo: <div className="whitespace-pre-wrap">{consultando.conteudo}</div>,
            },
          ]}
        />
      )}

      {alterando && (
        <ModalAlterarTermoUso
          auth={auth}
          tipo={alterando.tipo}
          idTermoInicial={alterando.idTermo}
          aoFechar={fecharAlterando}
          aoSalvar={recarregar}
        />
      )}

      {excluindo && (
        <ModalExcluirTermoUso
          auth={auth}
          termo={excluindo}
          aoFechar={fecharExcluindo}
          aoExcluido={recarregar}
        />
      )}
    </div>
  );
}
