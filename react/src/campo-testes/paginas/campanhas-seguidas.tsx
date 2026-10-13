import { useCallback } from 'react';
import { GenericTable } from '../../components/crud/generic-table';
import { seguirCampanhaApi } from '../../services/16-seguir-campanha/api/seguir-campanha.api';
import { useCrudModais } from '../../services/constant/hook/use-crud-modais';
import { useCampanhasCampoTestes, type CampanhaLinha } from '../servicos/hook/use-campanhas-campo-testes';
import { RegistroChamadas } from './registro-chamadas';
import type { PropsPagina } from '../../services/router/pagina.type';

// T4: as campanhas que a conta logada segue (RF-010, RF-011), com as mesmas colunas do T2. O Consultar mostra as
// atualizações publicadas (o que quem segue vai receber por e-mail, RF-053). Deixar de seguir tira a campanha da
// lista na hora.
export function CampanhasSeguidas({ auth }: PropsPagina) {
  const { chaveRecarga, recarregar } = useCrudModais<CampanhaLinha>();
  const campanhas = useCampanhasCampoTestes(auth, recarregar);

  const listar = useCallback(async (): Promise<CampanhaLinha[]> => {
    if (auth.carregando) {
      return [];
    }
    const [seguidas, linhas] = await Promise.all([seguirCampanhaApi.listarMinhas(auth.authFetch), campanhas.buscarLinhas()]);
    const ids = new Set(seguidas.map((item) => item.idCampanha));
    return linhas.filter((linha) => ids.has(linha.idCampanha));
    // `campanhas` (o hook) é um objeto novo a cada desenho: na lista, a tabela buscaria sem parar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.carregando, auth.authFetch]);

  return (
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

      {campanhas.modais}

      <RegistroChamadas />
    </div>
  );
}
