import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import { CabecalhoPagina } from './cabecalho-pagina';

export interface ItemMenuAreaUsuario {
  to: string;
  rotulo: string;
  icone: string;
}

interface LayoutAreaUsuarioProps {
  titulo: string;
  descricao: string;
  itens: ItemMenuAreaUsuario[];
  rotuloMenu: string;
  // Acima dos itens do menu lateral (só na tela larga).
  topoMenu?: ReactNode;
  // false: o conteúdo já traz a própria margem interna (as abas da Minha Conta).
  preenchimento?: boolean;
  children: ReactNode;
}

// Esqueleto único da área do usuário (Minha Conta e Estúdio do pesquisador, 14-11-2026):
//   - a largura do cabeçalho (.largura-site): o conteúdo alinha com o logo e o menu do topo;
//   - a partir de 768px (md): menu lateral de 15rem à esquerda;
//   - no celular: ABAS ROLÁVEIS (padrão do Material Design para 3 a 6 seções; decisão do Lucas): texto com ícone,
//     sublinhado verde na ativa, esmaecido na borda quando há mais itens para o lado, e a ativa sempre à vista;
//   - o conteúdo dentro de um cartão;
//   - o mesmo topo das páginas públicas (22-11-2026): fundo da página, py-16 e o CabecalhoPagina (a trilha Início > página
//     em cima do título), como no Como funciona, no Sobre e no Explorar.
export function LayoutAreaUsuario({ titulo, descricao, itens, rotuloMenu, topoMenu, preenchimento = true, children }: LayoutAreaUsuarioProps) {
  return (
    <div className="fundo-pagina min-h-full py-16">
      <div className="largura-site w-full">
        <CabecalhoPagina className="mb-8" titulo={titulo} descricao={descricao} />

        <AbasCelular itens={itens} rotuloMenu={rotuloMenu} />

        <div className="grid gap-6 md:grid-cols-[15rem_minmax(0,1fr)] items-start">
          <aside aria-label={rotuloMenu} className="hidden md:block min-w-0 space-y-4">
            {topoMenu}
            <nav aria-label={rotuloMenu} className="flex flex-col gap-2">
              {itens.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    'paragrafo enfase flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors ' +
                    (isActive
                      ? 'fundo-cartao borda-marca texto-marca shadow-sm'
                      : 'fundo-cartao borda-padrao texto-herdado hover-fundo-sutil')
                  }
                >
                  <i className={`fa-solid ${item.icone} w-4`} aria-hidden="true"></i>
                  {item.rotulo}
                </NavLink>
              ))}
            </nav>
          </aside>

          <section className={`min-w-0 fundo-cartao border borda-padrao rounded-2xl shadow-sm ${preenchimento ? 'p-5 sm:p-8' : 'pb-8'}`}>
            {children}
          </section>
        </div>
      </div>
    </div>
  );
}

// Abas roláveis do celular (abaixo de 768px).
function AbasCelular({ itens, rotuloMenu }: { itens: ItemMenuAreaUsuario[]; rotuloMenu: string }) {
  const barraRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  const [temMaisDireita, setTemMaisDireita] = useState(false);
  const [temMaisEsquerda, setTemMaisEsquerda] = useState(false);

  const medir = () => {
    const barra = barraRef.current;
    if (!barra) return;
    setTemMaisEsquerda(barra.scrollLeft > 4);
    setTemMaisDireita(barra.scrollLeft + barra.clientWidth < barra.scrollWidth - 4);
  };

  // A aba ativa sempre à vista: rola só a barra (scrollTo), nunca a página.
  useEffect(() => {
    const barra = barraRef.current;
    if (!barra) return;
    const ativa = barra.querySelector<HTMLElement>('[aria-current="page"]');
    if (ativa) barra.scrollTo({ left: ativa.offsetLeft - (barra.clientWidth - ativa.offsetWidth) / 2 });
    medir();
  }, [pathname]);

  useEffect(() => {
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);

  return (
    <div className="relative md:hidden mb-4 border-b borda-padrao">
      <nav ref={barraRef} aria-label={rotuloMenu} onScroll={medir} className="flex overflow-x-auto hide-scrollbar">
        {itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              'paragrafo enfase flex shrink-0 items-center gap-2 px-4 py-3 whitespace-nowrap border-b-2 -mb-px transition-colors ' +
              (isActive ? 'borda-marca texto-marca' : 'border-transparent texto-fraco hover-texto-forte')
            }
          >
            <i className={`fa-solid ${item.icone}`} aria-hidden="true"></i>
            {item.rotulo}
          </NavLink>
        ))}
      </nav>
      {/* Esmaecido nas bordas: avisa que há mais abas para o lado. */}
      {temMaisEsquerda && (
        <span className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--cor-fundo-pagina)] to-transparent" aria-hidden="true" />
      )}
      {temMaisDireita && (
        <span className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--cor-fundo-pagina)] to-transparent" aria-hidden="true" />
      )}
    </div>
  );
}
