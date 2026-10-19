import { useCallback, useState } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { seguirCampanhaApi } from '../../services/16-seguir/api/seguir-campanha.api';
import { seguirPesquisadorApi } from '../../services/16-seguir/api/seguir-pesquisador.api';
import { useErroToast } from '../../components/layout/toast/use-erro-toast';
import { useToast } from '../../components/layout/toast/use-toast';
import type { SeguirPesquisadorResponse } from '../../services/16-seguir/type/seguir-pesquisador.type';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { useCampanhasCampoTestes, type CampanhaLinha } from '../servicos/hook/use-campanhas-campo-testes';
import { useAuthFetchRegistrado } from '../servicos/hook/use-chamada-registrada';
import { RegistroChamadas } from './registro-chamadas';
import type { PropsPagina } from '../../services/router/pagina.type';
import type { RegistroChamada } from '../servicos/context/campo-testes-context';

// De qual card é uma chamada do Registro de Chamadas: as do seguir pesquisador ficam no card dos pesquisadores; todo o
// resto (campanhas, comentários, atualizações, seguir campanha) no das campanhas.
const ehChamadaDePesquisadores = ({ caminho }: Pick<RegistroChamada, 'caminho'>) => caminho.startsWith('/seguir-pesquisador');
const ehChamadaDeCampanhas = (chamada: Pick<RegistroChamada, 'caminho'>) => !ehChamadaDePesquisadores(chamada);

// T4: as campanhas que a conta logada segue (RF-010, RF-011), com as mesmas colunas do T2. O Consultar mostra as
// atualizações publicadas (o que quem segue recebe por e-mail, RF-053). No segundo card, os pesquisadores que ela segue
// (RF-028; o botão de verdade fica na página pública do perfil, que ainda não existe; aqui se segue pelo coração da T1).
// Cada card tem o próprio Registro de Chamadas, como os da T5. Deixar de seguir tira da lista na hora.
export function CampanhasSeguidas({ auth }: PropsPagina) {
  const { chaveRecarga, recarregar } = useCrudModais<CampanhaLinha>();
  const campanhas = useCampanhasCampoTestes(auth, recarregar);
  const authFetch = useAuthFetchRegistrado(auth);
  const [recargaPesquisadores, setRecargaPesquisadores] = useState(0);
  const { reportarErro } = useErroToast();
  const { mostrar } = useToast();

  const listar = useCallback(async (): Promise<CampanhaLinha[]> => {
    if (auth.carregando) {
      return [];
    }
    const [seguidas, linhas] = await Promise.all([seguirCampanhaApi.listarMinhas(authFetch), campanhas.buscarLinhas()]);
    const ids = new Set(seguidas.map((item) => item.idCampanha));
    return linhas.filter((linha) => ids.has(linha.idCampanha));
    // `campanhas` (o hook) é um objeto novo a cada desenho: na lista, a tabela buscaria sem parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.carregando, auth.authFetch]);

  const listarPesquisadores = useCallback(
    () => seguirPesquisadorApi.listarMinhas(authFetch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.authFetch, recargaPesquisadores],
  );
  const deixarDeSeguir = (linha: SeguirPesquisadorResponse) =>
    seguirPesquisadorApi
      .deixarDeSeguir(authFetch, linha.idPesquisador)
      .then(() => {
        mostrar('Deixou de seguir.', linha.nomePesquisador ?? '');
        setRecargaPesquisadores((atual) => atual + 1);
      })
      .catch(reportarErro);

  return (
    <>
      <div className="admin-content-painel">
        <GenericTable<CampanhaLinha>
          {...campanhas.tabela}
          titulo="Campanhas Seguidas"
          ajuda="Campanhas que a conta logada segue. Para seguir, use o coração da Bancada da Campanha (T2)."
          listar={listar}
          chaveRecarga={chaveRecarga}
          acoes={campanhas.acoes}
          vazio={{
            icone: 'fa-bell',
            titulo: 'Você ainda não segue nenhuma campanha.',
            texto: 'Siga uma campanha publicada pelo coração da Bancada da Campanha (T2).',
          }}
        />

        <RegistroChamadas filtro={ehChamadaDeCampanhas} />
      </div>

      <div className="admin-content-painel">
        <GenericTable<SeguirPesquisadorResponse>
          titulo="Pesquisadores Seguidos"
          nivelTitulo={2}
          ajuda="Pesquisadores que a conta logada segue: ela recebe por e-mail as campanhas novas e as atualizações deles. Para seguir, use o coração da Bancada do Pesquisador (T1)."
          colunas={[
            { chave: 'idPesquisador', rotulo: 'id', tipo: 'id' },
            { chave: 'nomePesquisador', rotulo: 'pesquisador', tipo: 'nome', umaLinha: true },
            { chave: 'seguidoEm', rotulo: 'seguindo desde', tipo: 'dataHora' },
          ]}
          chavePrimaria="idSegPesquisador"
          listar={listarPesquisadores}
          acoes={{ deixarDeSeguir: (linha) => void deixarDeSeguir(linha) }}
          acoesEmColuna={[{ rotulo: 'seguir', acoes: ['deixarDeSeguir'] }]}
          vazio={{
            icone: 'fa-user-check',
            titulo: 'Você ainda não segue nenhum pesquisador.',
            texto: 'Siga um pesquisador pelo coração da Bancada do Pesquisador (T1).',
          }}
        />

        <RegistroChamadas filtro={ehChamadaDePesquisadores} />
      </div>

      {campanhas.modais}
    </>
  );
}
