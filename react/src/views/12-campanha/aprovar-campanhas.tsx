import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { campanhaApi } from '../../services/12-campanha/api/campanha.api';
import { ModalConsultarCampanha } from './modal-consultar-campanha';
import { ModalRevisarCampanha } from './modal-revisar-campanha';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { CampanhaResponse } from '../../services/12-campanha/type/campanha.type';

interface LinhaFila extends CampanhaResponse {
  pesquisador: string;
  area: string;
  atencao: string;
}

// Fila de aprovação do admin (grupo MODERAÇÃO do menu): só campanhas 'aguardando_aprovacao', com o sinal de
// score baixo na coluna "atenção" (só aparece para quem pode aprovar). Quem espera há mais tempo vem primeiro
// ("esperando", contado da última entrada na fila: um reenvio zera a espera). Alterar abre a revisão com tudo o que é
// preciso ler e os botões Aprovar e Rejeitar (quem barra de verdade é o banco); Consultar abre a campanha só para ler.
export function AprovarCampanhas({ auth }: PropsPagina) {
  const [revisandoId, setRevisandoId] = useState<number | null>(null);
  const [consultandoId, setConsultandoId] = useState<number | null>(null);
  const [chaveRecarga, setChaveRecarga] = useState(0);

  const listarFila = useCallback(async (): Promise<LinhaFila[]> => {
    const campanhas = await campanhaApi.listar(auth.authFetch, { status: 'aguardando_aprovacao' });
    const maisAntigaPrimeiro = [...campanhas].sort((a, b) =>
      (a.enviadoAprovacaoEm ?? a.criadoEm).localeCompare(b.enviadoAprovacaoEm ?? b.criadoEm),
    );
    return maisAntigaPrimeiro.map((campanha) => ({
      ...campanha,
      pesquisador: campanha.nomePesquisador ?? `#${campanha.idUsuario}`,
      area: campanha.nomeArea ?? `#${campanha.idAreaConhecimento}`,
      atencao: campanha.precisaRevisaoScore ? 'Score baixo' : '',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authFetch, chaveRecarga]);

  return (
    <div className="admin-content-painel">
      <GenericTable<LinhaFila>
        titulo="Aprovar Campanhas"
        ajuda="Campanhas enviadas pelos pesquisadores, esperando a sua avaliação. Quem espera há mais tempo aparece primeiro."
        colunas={[
          { chave: 'idCampanha', rotulo: 'id', tipo: 'id' },
          { chave: 'titulo', rotulo: 'título', tipo: 'nome', umaLinha: true },
          { chave: 'pesquisador', rotulo: 'pesquisador', tipo: 'texto' },
          { chave: 'atencao', rotulo: 'atenção', tipo: 'status' },
          { chave: 'metaFinanceira', rotulo: 'meta', tipo: 'dinheiro' },
          { chave: 'enviadoAprovacaoEm', rotulo: 'esperando', tipo: 'espera' },
        ]}
        chavePrimaria="idCampanha"
        vazio={{
          icone: 'fa-circle-check',
          titulo: 'Nenhuma campanha esperando aprovação.',
          texto: 'Tudo em dia. Quando um pesquisador enviar uma campanha, ela aparece aqui.',
        }}
        listar={listarFila}
        acoes={{ alterar: (linha) => setRevisandoId(linha.idCampanha), consultar: (linha) => setConsultandoId(linha.idCampanha) }}
        filtrosFacetados={[{ chave: 'area', rotulo: 'Área' }]}
      />

      {consultandoId !== null && (
        <ModalConsultarCampanha auth={auth} idCampanha={consultandoId} aoFechar={() => setConsultandoId(null)} />
      )}
      {revisandoId !== null && (
        <ModalRevisarCampanha
          auth={auth}
          idCampanha={revisandoId}
          aoFechar={() => setRevisandoId(null)}
          aoConcluido={() => setChaveRecarga((atual) => atual + 1)}
        />
      )}
    </div>
  );
}
