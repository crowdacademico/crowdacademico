import type { MouseEvent } from 'react';
import { Outlet } from 'react-router';
import { BarraCarregamento } from './barra-carregamento/barra-carregamento';
import { Footer } from './footer';
import { Header } from './header';
import { LimiteErro } from './limite-erro';
import { useAlturaTopoFixo, useTopoAoTrocarDePagina } from './use-posicao-da-tela';
import { TelaAceiteTermoUso } from '../../views/5-termo-uso/tela-aceite-termo-uso';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface LayoutPublicoProps {
  auth: UseAuthReturn;
}

function PularParaConteudoPublico() {
  const pular = (evento: MouseEvent<HTMLAnchorElement>) => {
    evento.preventDefault();
    document.querySelector<HTMLElement>('[data-conteudo-principal]')?.focus();
  };

  return (
    <a
      href="#conteudo-publico"
      onClick={pular}
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-(--camada-pular-para-conteudo) btn btn-primary"
    >
      Pular para o conteúdo
    </a>
  );
}

export function LayoutPublico({ auth }: LayoutPublicoProps) {
  useTopoAoTrocarDePagina();
  useAlturaTopoFixo();
  // RF-015: com a sessão aberta e uma versão nova do Termo de Uso (ou do Termo de Pesquisador) ainda não aceita, o
  // aceite toma o lugar do conteúdo em toda a área pública, na Minha Conta e no Estúdio (todos moram neste layout),
  // como o AdminLayout faz no painel. Só dá para ler, aceitar ou sair; sem login, navegar continua livre.
  const aceitePendente = Boolean(auth.usuario) && auth.aceitePendente;

  return (
    <div className="layout-publico w-full min-h-0 flex flex-col flex-1">
      <PularParaConteudoPublico />
      <BarraCarregamento />
      <Header auth={auth} variante="publico" />
      <div
        id="conteudo-publico"
        data-conteudo-principal
        tabIndex={-1}
        className="flex flex-col flex-1 outline-none"
      >
        <LimiteErro>
          {aceitePendente ? <TelaAceiteTermoUso auth={auth} /> : <Outlet />}
        </LimiteErro>
      </div>
      <Footer />
    </div>
  );
}
