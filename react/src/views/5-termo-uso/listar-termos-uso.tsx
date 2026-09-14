import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { GenericTable } from '../../components/crud/generic-table';
import { ModalDetalhe } from '../../components/crud/modal-detalhe';
import { termoUsoApi } from '../../services/5-termo-uso/api/termo-uso.api';
import { ROTULO_TIPO_TERMO } from '../../services/5-termo-uso/constants/termo-uso-tipos';
import { formatarDataHora } from '../../services/constant/utils/formatacao.util';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { TermoUsoResponse } from '../../services/5-termo-uso/type/termo-uso.type';

// Criar/Listar/Consultar (13-09-2026). `conteudo` não vira coluna (texto
// integral, longo demais pra tabela) - Consultar abre no MESMO ModalDetalhe
// já usado por Permissões, através do ícone de Ações padrão (`aoConsultar`,
// achado do Lucas 13-09-2026: "precisa ser igual aos outros" - a versão
// anterior tinha um botão "Ver texto" dentro de uma coluna comum, diferente
// do ícone discreto que toda outra tabela do painel usa pra "Consultar").
//
// Alterar (mesmo dia, decisão do Lucas depois do AskUserQuestion: "editar só
// enquanto ninguém aceitou ainda") navega pra página própria via `rotaBase`
// (mesmo padrão de Configuração/Área de Conhecimento/Tipo de Link - GenericTable
// mistura os dois: Consultar por modal, Alterar por Link, sem precisar de
// `aoAlterar`). Segue SEM Excluir - nenhuma versão pode desaparecer (rastro
// de auditoria), ver TermoUsoServiceCriar/Alterar no Nest.
export function ListarTermosUso({ auth }: PropsPagina) {
  const [termoDetalhado, setTermoDetalhado] = useState<TermoUsoResponse | null>(null);
  const listarTermos = useCallback(() => termoUsoApi.listar(auth.authFetch), [auth.authFetch]);

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
          {
            chave: 'tipo',
            rotulo: 'tipo',
            renderizar: (linha) => ROTULO_TIPO_TERMO[linha.tipo],
          },
          { chave: 'versao', rotulo: 'versão' },
          { chave: 'ativo', rotulo: 'ativo' },
          {
            chave: 'criadoEm',
            rotulo: 'publicado em',
            renderizar: (linha) => formatarDataHora(linha.criadoEm),
          },
        ]}
        chavePrimaria="idTermo"
        listar={listarTermos}
        rotaBase="/admin/termos-uso"
        // Alterar/Consultar, sem Excluir (13-09-2026) - `rotaBase` sozinho
        // faria os 3 botões padrão aparecerem (achado do Lucas: é assim que
        // o link quebrado de Alterar/Excluir apareceu aqui e em Pesquisadores
        // antes desta correção), então `acoes` restringe pros 2 que existem
        // de verdade. Consultar usa modal (`aoConsultar` sobrepõe o Link
        // padrão); Alterar não tem `aoAlterar`, então cai no Link padrão de
        // `rotaBase` (página própria).
        acoes={['alterar', 'consultar']}
        aoConsultar={(linha) => setTermoDetalhado(linha)}
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
    </div>
  );
}
