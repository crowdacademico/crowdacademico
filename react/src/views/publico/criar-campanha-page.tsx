import { Navigate, useLocation, useNavigate } from 'react-router';
import { AvisoSoPesquisador } from '../../components/crud/aviso-so-pesquisador';
import { Carregando } from '../../components/layout/carregando';
import { useSituacaoPesquisador } from '../../services/6-perfil-pesquisador/hook/use-situacao-pesquisador';
import type { PropsPagina } from '../../services/router/pagina.type';
import { ModalCriarCampanha } from './modal-criar-campanha-publico';

function obterCaminhoRetorno(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('voltarPara' in state)) return null;
  return typeof state.voltarPara === 'string' ? state.voltarPara : null;
}

export function CriarCampanhaPage({ auth }: PropsPagina) {
  const navegar = useNavigate();
  const localizacao = useLocation();
  const situacaoPesquisador = useSituacaoPesquisador(auth.authFetch, auth.usuario);

  if (auth.carregando) {
    return null;
  }
  if (!auth.usuario) {
    return <Navigate to="/login" replace />;
  }
  if (situacaoPesquisador === null) {
    return <Carregando className="largura-site mx-auto px-4 py-8" />;
  }
  if (situacaoPesquisador !== 'ativo') {
    return (
      <main className="largura-site mx-auto w-full max-w-3xl px-4 py-8">
        <h1 className="titulo-pagina texto-forte mb-5">Submeter pesquisa</h1>
        <AvisoSoPesquisador
          situacao={situacaoPesquisador}
          fazem="com perfil ativo podem submeter campanhas"
          fazer="submeter campanhas"
        />
      </main>
    );
  }

  return (
    <ModalCriarCampanha
      auth={auth}
      comRecompensas
      aoMudar={() => undefined}
      aoFechar={() => {
        void navegar(obterCaminhoRetorno(localizacao.state) ?? '/', { replace: true });
      }}
    />
  );
}
