import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { CampoFicha, SecaoFicha } from '../../components/crud/ficha-consulta';
import { ListaAnexos } from '../../components/crud/lista-anexos';
import { ModalFicha } from '../../components/crud/modal-ficha';
import { ModalExcluirAtualizacao } from './modal-excluir-atualizacao';
import { atualizacaoCampanhaApi } from '../../services/15-atualizacao-campanha/api/atualizacao-campanha.api';
import {
  ROTULO_FASE_ATUALIZACAO,
  rotuloSituacaoAtualizacao,
} from '../../services/15-atualizacao-campanha/constants/atualizacao-campanha.constants';
import { formatarDataHora } from '../../services/constant/util/formatacao.util';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { AtualizacaoModeracaoResponse } from '../../services/15-atualizacao-campanha/type/atualizacao-campanha.type';

interface AtualizacaoLinha extends AtualizacaoModeracaoResponse {
  campanha: string;
  faseRotulo: string;
  quantidadeAnexos: number;
  situacao: string;
}

const SITUACOES = ['Visível', 'Excluída pelo pesquisador', 'Excluída pela moderação'];

function paraLinha(atualizacao: AtualizacaoModeracaoResponse): AtualizacaoLinha {
  return {
    ...atualizacao,
    campanha: atualizacao.tituloCampanha ?? `Campanha #${atualizacao.idCampanha}`,
    faseRotulo: ROTULO_FASE_ATUALIZACAO[atualizacao.fase],
    quantidadeAnexos: atualizacao.anexos.length,
    situacao: rotuloSituacaoAtualizacao(atualizacao),
  };
}

// Atualizações: o que os pesquisadores publicaram em todas as campanhas, a mais nova primeiro, com os anexos. A
// moderação exclui a que estiver em desacordo com as regras (RF-053), mantendo o registro (fica aqui como Excluída e o
// pesquisador não apaga) ou de vez (ModalExcluirAtualizacao). Quem não modera vê as visíveis e as próprias (a RLS decide).
export function ListarAtualizacoes({ auth }: PropsPagina) {
  const [consultando, setConsultando] = useState<AtualizacaoLinha | null>(null);
  const [excluindo, setExcluindo] = useState<AtualizacaoLinha | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);

  const listar = useCallback(
    async (): Promise<AtualizacaoLinha[]> => (await atualizacaoCampanhaApi.listarModeracao(auth.authFetch)).map(paraLinha),
    [auth.authFetch],
  );

  return (
    <div className="admin-content-painel">
      <GenericTable<AtualizacaoLinha>
        titulo="Atualizações"
        ajuda="O que os pesquisadores publicaram nas campanhas, a mais nova primeiro. Excluir pode manter o registro (fica aqui como Excluída e sai da página da campanha) ou apagar de vez."
        colunas={[
          { chave: 'idAtualizacao', rotulo: 'id', tipo: 'id' },
          { chave: 'titulo', rotulo: 'título', tipo: 'nome', umaLinha: true },
          { chave: 'campanha', rotulo: 'campanha', tipo: 'texto', umaLinha: true },
          { chave: 'faseRotulo', rotulo: 'fase', tipo: 'status' },
          { chave: 'quantidadeAnexos', rotulo: 'anexos', tipo: 'id' },
          { chave: 'situacao', rotulo: 'situação', tipo: 'status' },
          { chave: 'publicadoEm', rotulo: 'publicada em', tipo: 'dataHora' },
        ]}
        vazio={{
          icone: 'fa-bullhorn',
          titulo: 'Nenhuma atualização ainda.',
          texto: 'Quando um pesquisador publicar uma atualização numa campanha, ela aparece aqui.',
        }}
        chavePrimaria="idAtualizacao"
        listar={listar}
        chaveRecarga={chaveRecarga}
        acoes={{
          consultar: setConsultando,
          excluir: setExcluindo,
        }}
        filtrosFacetados={[
          { chave: 'situacao', rotulo: 'Situação', ordem: SITUACOES },
          { chave: 'faseRotulo', rotulo: 'Fase', ordem: Object.values(ROTULO_FASE_ATUALIZACAO) },
        ]}
      />

      {consultando && (
        <ModalFicha titulo={consultando.titulo} subtitulo={consultando.campanha} aoFechar={() => setConsultando(null)}>
          <SecaoFicha titulo="Atualização">
            <CampoFicha rotulo="Fase" valor={consultando.faseRotulo} />
            <CampoFicha rotulo="Publicada em" valor={formatarDataHora(consultando.publicadoEm)} />
            <CampoFicha rotulo="Situação" valor={consultando.situacao} />
            <CampoFicha rotulo="Conteúdo" valor={<span className="whitespace-pre-line">{consultando.conteudo}</span>} largura="cheia" />
            <CampoFicha
              rotulo="Anexos"
              largura="cheia"
              valor={consultando.anexos.length > 0 ? <ListaAnexos anexos={consultando.anexos} /> : undefined}
            />
          </SecaoFicha>
        </ModalFicha>
      )}

      {excluindo && (
        <ModalExcluirAtualizacao
          authFetch={auth.authFetch}
          atualizacao={excluindo}
          campanha={excluindo.campanha}
          situacao={excluindo.situacao}
          moderacao
          aoFechar={() => setExcluindo(null)}
          aoExcluida={() => setChaveRecarga((atual) => atual + 1)}
        />
      )}
    </div>
  );
}
