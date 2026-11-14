import { Navigate, useLocation } from 'react-router';

const DESTINOS_PAINEL: Record<string, string> = {
  '/minha-conta': '/minha-conta/perfil',
  '/minhas-contribuicoes': '/minha-conta/contribuicoes',
  '/painel-doador': '/minha-conta/contribuicoes',
  '/painel-pesquisador': '/estudio-pesquisador',
};

export function RedirecionarAreaConta() {
  const { pathname } = useLocation();
  return <Navigate to={DESTINOS_PAINEL[pathname] ?? '/login'} replace />;
}
