import type { MouseEvent } from 'react';
import { Outlet } from 'react-router';
import { BarraCarregamento } from './barra-carregamento/barra-carregamento';
import { FooterPublico } from './footer-publico';
import { HeaderPublico } from './header-publico';
import { LimiteErro } from './limite-erro';
import { useAlturaTopoFixo, useTopoAoTrocarDePagina } from './use-posicao-da-tela';
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

  return (
    <div className="layout-publico w-full min-h-0 flex flex-col flex-1">
      <PularParaConteudoPublico />
      <BarraCarregamento />
      <HeaderPublico auth={auth} />
      <div
        id="conteudo-publico"
        data-conteudo-principal
        tabIndex={-1}
        className="flex flex-col flex-1 outline-none"
      >
        <LimiteErro>
          <Outlet />
        </LimiteErro>
      </div>
      <FooterPublico />
    </div>
  );
}
