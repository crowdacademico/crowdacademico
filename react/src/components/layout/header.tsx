import { useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { ControleFonte } from './cabecalho/controle-fonte';
import { ControleTema } from './cabecalho/controle-tema';
import { DevLoginRapido } from './cabecalho/dev-login-rapido';
import { MenuUsuario } from './cabecalho/menu-usuario';
import { SinoAtividade } from './cabecalho/sino-atividade';
import { LogoMarca } from './logo-marca';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';
import { useFocoPreso } from '../../services/constant/hook/use-foco-preso';

// Cabeçalho ÚNICO do sistema (16-11-2026, pergunta da Alexia "vai unir os header?"): antes eram dois, um da área
// pública (header-publico.tsx) e um do painel, cada um com a sua marca e o seu jeito, e iam se afastando. Como o rodapé
// (footer.tsx, unificado em 14-11-2026), agora é um componente só, com o que é comum igual nos dois lugares: a marca
// oficial (LogoMarca, a mesma do rodapé), fonte, tema, sino e o menu da conta.
//
// `variante`:
// - 'publico' (layout-publico.tsx: o site, as campanhas, o Estúdio, a Minha Conta): também os links de navegação, o
//   "Submeter pesquisa" e, no celular, a gaveta de menu;
// - 'painel' (layout.tsx: o painel /admin): sem esses links, porque o painel navega pelo menu lateral.
interface HeaderProps {
  auth: UseAuthReturn;
  variante?: 'publico' | 'painel';
}

const LINKS_PUBLICOS = [
  { to: '/explorar', rotulo: 'Explorar' },
  { to: '/como-funciona', rotulo: 'Como funciona' },
  { to: '/sobre', rotulo: 'Sobre' },
];

export function Header({ auth, variante = 'painel' }: HeaderProps) {
  const publico = variante === 'publico';
  const [menuAberto, setMenuAberto] = useState(false);
  const localizacao = useLocation();
  const voltarPara = `${localizacao.pathname}${localizacao.search}`;

  // Gaveta do celular é uma janela (role=dialog): o foco entra nela ao abrir, o Tab fica lá dentro, o Esc fecha e o foco
  // volta ao botão do menu (WCAG 2.4.3, ordem do foco).
  const gavetaRef = useRef<HTMLElement>(null);
  useFocoPreso(gavetaRef, publico && menuAberto, () => setMenuAberto(false));

  return (
    // `relative`: âncora para o DevLoginRapido, que fica fora do grupo da direita (ver o comentário perto dele).
    <header
      data-topo-fixo
      className={(publico ? 'header-publico ' : '') + 'fundo-cartao border-b borda-padrao sticky top-0 z-50 shadow-sm relative'}
    >
      <div className="largura-site h-16 flex items-center justify-between gap-4">
        {/* A mesma marca e a mesma caixa (.largura-site) do rodapé: as duas ficam na mesma linha vertical. */}
        <Link to="/" className="flex items-center gap-3 shrink-0" aria-label="CrowdAcadêmico, página inicial">
          <LogoMarca />
          <span className="titulo-secao hidden sm:block">CrowdAcadêmico</span>
        </Link>

        {publico && (
          <nav className="hidden lg:flex items-center gap-6 mx-2" aria-label="Navegação principal">
            {LINKS_PUBLICOS.map(({ to, rotulo }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMenuAberto(false)}
                className={({ isActive }) =>
                  `header-publico__link legenda enfase transition-colors ${isActive ? 'texto-marca' : 'texto-padrao hover-texto-marca'}`
                }
              >
                {rotulo}
              </NavLink>
            ))}
          </nav>
        )}

        {/* O menu da conta (MenuUsuario) fica no CANTO de verdade: por isso o DevLoginRapido fica fora deste grupo. */}
        <div className="flex items-center gap-2 sm:gap-3">
          {publico && (
            <Link to="/criar-campanha" state={{ voltarPara }} className="btn btn-primary hidden lg:block">
              Submeter pesquisa
            </Link>
          )}
          {/* Sino: logado, a atividade recente; visitante, no site, um atalho para a página de notificações. */}
          {auth.autenticado && !auth.aceitePendente ? (
            // No site, o celular precisa do espaço para o botão do menu; no painel, o sino fica sempre.
            <div className={publico ? 'hidden sm:block' : undefined}>
              <SinoAtividade auth={auth} />
            </div>
          ) : (
            publico && (
              <Link
                to="/notificacoes"
                aria-label="Notificações"
                title="Notificações"
                className="relative hidden sm:flex w-9 h-9 rounded-lg border borda-padrao items-center justify-center texto-padrao hover-fundo-sutil transition-colors"
              >
                <i className="fa-solid fa-bell" aria-hidden="true" />
              </Link>
            )
          )}
          <div className={publico ? 'hidden sm:block' : undefined}>
            <ControleFonte />
          </div>
          <ControleTema />
          <MenuUsuario auth={auth} />
          {publico && (
            <button
              type="button"
              onClick={() => setMenuAberto((aberto) => !aberto)}
              aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={menuAberto}
              aria-controls="menu-publico-movel"
              className="lg:hidden w-9 h-9 rounded-lg border borda-padrao flex items-center justify-center texto-padrao hover-fundo-sutil transition-colors"
            >
              <i className={`fa-solid ${menuAberto ? 'fa-xmark' : 'fa-bars'}`} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {publico && (
        <div className="header-publico__camada-menu lg:hidden" hidden={!menuAberto}>
          <button type="button" className="header-publico__fundo-menu" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} />
          <nav
            id="menu-publico-movel"
            aria-label="Navegação principal móvel"
            aria-modal="true"
            role="dialog"
            ref={gavetaRef}
            tabIndex={-1}
            className="header-publico__gaveta-menu fundo-cartao"
          >
            <div className="flex items-center justify-between p-5 border-b borda-padrao">
              <span className="font-bold texto-forte">Menu</span>
              <button
                type="button"
                onClick={() => setMenuAberto(false)}
                aria-label="Fechar menu"
                className="w-8 h-8 rounded-lg hover-fundo-sutil flex items-center justify-center texto-padrao"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-col p-5 gap-1">
              {LINKS_PUBLICOS.map(({ to, rotulo }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMenuAberto(false)}
                  className={({ isActive }) =>
                    `py-3 px-2 rounded-lg enfase transition-colors ${isActive ? 'texto-marca fundo-sutil' : 'texto-padrao hover-fundo-sutil'}`
                  }
                >
                  {rotulo}
                </NavLink>
              ))}
              <Link to="/notificacoes" onClick={() => setMenuAberto(false)} className="py-3 px-2 rounded-lg enfase texto-padrao hover-fundo-sutil">
                Notificações
              </Link>
              <Link
                to="/criar-campanha"
                state={{ voltarPara }}
                onClick={() => setMenuAberto(false)}
                className="py-3 px-2 rounded-lg enfase texto-marca hover-fundo-sutil"
              >
                Submeter pesquisa
              </Link>
            </div>
            <div className="flex items-center gap-3 p-5 border-t borda-padrao mt-auto">
              <ControleFonte />
            </div>
          </nav>
        </div>
      )}

      {/* DevLoginRapido ABSOLUTO, fora do grupo da direita: assim não empurra o menu da conta para fora do canto. Abaixo de
          --breakpoint-dev-login (tailwind-theme.css) não sobra espaço à direita, e ele desce para logo abaixo do
          cabeçalho. Só em `npm run dev` (import.meta.env.DEV): nunca vai para o build, senão qualquer link público
          exporia um login instantâneo de admin (DOCUMENTACAO_FRONTEND.md, seção 9). */}
      {import.meta.env.DEV && !auth.autenticado && !auth.carregando && (
        <div className="absolute top-full mt-2 right-1 sm:right-2 dev-login:top-1/2 dev-login:mt-0 dev-login:-translate-y-1/2">
          <DevLoginRapido auth={auth} />
        </div>
      )}
    </header>
  );
}
