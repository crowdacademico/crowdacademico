import { Outlet } from 'react-router';
import { Breadcrumb } from './breadcrumb';
import { Footer } from './footer';
import { Header } from './header';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface LayoutProps {
  auth: UseAuthReturn;
}

// Layout de rota (App.tsx) - Header e Footer únicos em toda página,
// Breadcrumb entre eles (só aparece fora da home). `auth` vem de App.tsx
// (useAuth chamado uma vez só, lá em cima) e desce por prop pra Header e
// pra cada página via <Outlet context> não é necessário aqui porque as
// rotas já recebem `auth` direto como prop em App.tsx.
export function Layout({ auth }: LayoutProps) {
  return (
    <>
      <Header auth={auth} />
      <Breadcrumb />
      <Outlet />
      <Footer />
    </>
  );
}
