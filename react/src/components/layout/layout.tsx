import type { MouseEvent } from 'react';
import { Outlet } from 'react-router';
import { BarraCarregamento } from './barra-carregamento/barra-carregamento';
import { Breadcrumb } from './breadcrumb';
import { Footer } from './footer';
import { Header } from './header';
import { LimiteErro } from './limite-erro';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface LayoutProps {
  auth: UseAuthReturn;
}

// Layout de rota (App.tsx) - Header e Footer únicos em toda página,
// Breadcrumb entre eles (só aparece fora da home). `auth` vem de App.tsx
// (useAuth chamado uma vez só, lá em cima) e desce por prop pra Header e
// pra cada página via <Outlet context> não é necessário aqui porque as
// rotas já recebem `auth` direto como prop em App.tsx.
// Atalho para quem usa só o teclado: é o primeiro Tab da página e pula cabeçalho e menu lateral (sem ele, eram 34
// Tabs até o primeiro botão de uma tabela). Invisível até receber o foco. O alvo é a área de conteúdo mais
// interna marcada com data-conteudo-principal: no painel, a área ao lado do menu; fora dele, o <main>.
function PularParaConteudo() {
  const pular = (evento: MouseEvent<HTMLAnchorElement>) => {
    evento.preventDefault();
    const alvos = document.querySelectorAll<HTMLElement>('[data-conteudo-principal]');
    if (alvos.length > 0) {
      alvos[alvos.length - 1].focus();
    }
  };
  return (
    <a
      href="#conteudo"
      onClick={pular}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] btn btn-primary"
    >
      Pular para o conteúdo
    </a>
  );
}

export function Layout({ auth }: LayoutProps) {
  return (
    <>
      <PularParaConteudo />
      <BarraCarregamento />
      <Header auth={auth} />
      <Breadcrumb />
      <main id="conteudo" data-conteudo-principal tabIndex={-1} className="flex flex-col flex-1 outline-none">
        <LimiteErro>
          <Outlet />
        </LimiteErro>
      </main>
      <Footer />
    </>
  );
}
