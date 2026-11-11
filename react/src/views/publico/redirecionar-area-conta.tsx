import { Navigate, useLocation } from 'react-router';

const DESTINOS_PAINEL: Record<string, string> = {
  '/minha-conta': '/admin/minha-conta/perfil',
  '/minhas-campanhas': '/admin/minhas-campanhas',
  '/criar-campanha': '/admin/minhas-campanhas',
  '/minhas-contribuicoes': '/admin/minha-conta/contribuicoes',
  '/painel-doador': '/admin/minha-conta/contribuicoes',
  '/painel-pesquisador': '/admin/minhas-campanhas',
};

export function RedirecionarAreaConta() {
  const { pathname } = useLocation();
  return <Navigate to={DESTINOS_PAINEL[pathname] ?? '/login'} replace />;
}
