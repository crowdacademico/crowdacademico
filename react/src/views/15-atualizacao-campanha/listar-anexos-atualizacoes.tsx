import { useCallback } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { atualizacaoCampanhaApi } from '../../services/15-atualizacao-campanha/api/atualizacao-campanha.api';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { AnexoAtualizacaoResponse } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';

interface AnexoLinha extends AnexoAtualizacaoResponse {
  chave: string;
  tipoAnexo: string;
  campanha: string;
  situacaoAtualizacao: string;
}

const ROTULO_TIPO_ANEXO: Record<AnexoAtualizacaoResponse['tipo'], string> = { arquivo: 'Arquivo', link: 'Link' };
const ATUALIZACAO_VISIVEL = 'Visível';
const ATUALIZACAO_OCULTA = 'Oculta';

function paraLinha(anexo: AnexoAtualizacaoResponse): AnexoLinha {
  return {
    ...anexo,
    // O id só é único junto com o tipo (arquivo e link vêm de tabelas diferentes).
    chave: `${anexo.tipo}-${anexo.idAnexo}`,
    tipoAnexo: ROTULO_TIPO_ANEXO[anexo.tipo],
    campanha: anexo.tituloCampanha ?? `Campanha #${anexo.idCampanha}`,
    situacaoAtualizacao: anexo.atualizacaoAtiva ? ATUALIZACAO_VISIVEL : ATUALIZACAO_OCULTA,
  };
}

// Anexos das Atualizações: todos os arquivos e links publicados nas atualizações de campanha, o mais novo primeiro.
// Só leitura: ocultar uma atualização (e os anexos com ela) é no Alterar da campanha. O anexo é a coluna nome
// (DS-45) e abre o arquivo ou o link numa aba nova.
export function ListarAnexosAtualizacoes({ auth }: PropsPagina) {
  const listar = useCallback(
    async (): Promise<AnexoLinha[]> => (await atualizacaoCampanhaApi.listarAnexos(auth.authFetch)).map(paraLinha),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable
        titulo="Anexos das Atualizações"
        ajuda="Todos os arquivos e links publicados nas atualizações das campanhas, o mais novo primeiro. Clique no anexo para abrir. Arquivo: a data é a do envio. Link: o link não guarda data própria, então vale a da publicação da atualização. Oculta: a atualização foi escondida pelo dono ou pela moderação. Só leitura."
        colunas={[
          { chave: 'idAnexo', rotulo: 'id', tipo: 'id' },
          {
            chave: 'nome',
            rotulo: 'anexo',
            tipo: 'nome',
            umaLinha: true,
            renderizar: (linha: AnexoLinha) =>
              linha.url === null ? (
                linha.nome
              ) : (
                <a href={linha.url} target="_blank" rel="noopener noreferrer" className="texto-marca enfase underline">
                  {linha.nome}
                </a>
              ),
            textoExibido: (linha: AnexoLinha) => linha.nome,
          },
          { chave: 'tipoAnexo', rotulo: 'tipo', tipo: 'status' },
          { chave: 'campanha', rotulo: 'campanha', tipo: 'texto', umaLinha: true },
          { chave: 'tituloAtualizacao', rotulo: 'atualização', tipo: 'texto', umaLinha: true },
          { chave: 'situacaoAtualizacao', rotulo: 'atualização está', tipo: 'status' },
          { chave: 'quando', rotulo: 'quando', tipo: 'dataHora' },
        ]}
        vazio={{
          icone: 'fa-paperclip',
          titulo: 'Nenhum anexo ainda.',
          texto: 'Quando um pesquisador publicar uma atualização com arquivo ou link, o anexo aparece aqui.',
        }}
        chavePrimaria="chave"
        listar={listar}
        filtrosFacetados={[
          { chave: 'tipoAnexo', rotulo: 'Tipo', ordem: Object.values(ROTULO_TIPO_ANEXO) },
          { chave: 'situacaoAtualizacao', rotulo: 'Atualização', ordem: [ATUALIZACAO_VISIVEL, ATUALIZACAO_OCULTA] },
        ]}
      />
    </div>
  );
}
