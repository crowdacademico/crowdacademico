import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { ControleFonte } from './cabecalho/controle-fonte';
import { ControleTema } from './cabecalho/controle-tema';
import { MenuUsuario } from './cabecalho/menu-usuario';
import { SinoAtividade } from './cabecalho/sino-atividade';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface HeaderPublicoProps {
  auth: UseAuthReturn;
}

const LINKS_PUBLICOS = [
  { to: '/explorar', rotulo: 'Explorar' },
  { to: '/como-funciona', rotulo: 'Como funciona' },
  { to: '/sobre', rotulo: 'Sobre' },
];

export function HeaderPublico({ auth }: HeaderPublicoProps) {
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (!menuAberto) return;
    const fecharComEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAberto(false);
    };
    window.addEventListener('keydown', fecharComEscape);
    return () => window.removeEventListener('keydown', fecharComEscape);
  }, [menuAberto]);

  return (
    <header data-topo-fixo className="header-publico fundo-cartao border-b borda-padrao sticky top-0 z-50 shadow-sm">
      <div className="largura-site h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 shrink-0" aria-label="CrowdAcadêmico, página inicial">
          <span className="header-publico__marca" aria-hidden="true">
            <i className="fa-solid fa-flask" />
          </span>
          <span className="font-bold text-2xl tracking-tight hidden sm:block">CrowdAcadêmico</span>
        </Link>

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

        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/criar-campanha" className="btn btn-primary hidden lg:block">
            Submeter pesquisa
          </Link>
          {auth.autenticado && !auth.aceitePendente ? (
            <div className="hidden sm:block">
              <SinoAtividade auth={auth} />
            </div>
          ) : (
            <Link
              to="/notificacoes"
              aria-label="Notificações"
              title="Notificações"
              className="relative hidden sm:flex w-9 h-9 rounded-lg border borda-padrao items-center justify-center texto-padrao hover-fundo-sutil transition-colors"
            >
              <i className="fa-solid fa-bell" aria-hidden="true" />
            </Link>
          )}
          <div className="hidden sm:block">
            <ControleFonte />
          </div>
          <ControleTema />
          <MenuUsuario auth={auth} />
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
        </div>
      </div>

      <div className="header-publico__camada-menu lg:hidden" hidden={!menuAberto}>
          <button
            type="button"
            className="header-publico__fundo-menu"
            aria-label="Fechar menu"
            onClick={() => setMenuAberto(false)}
          />
          <nav
            id="menu-publico-movel"
            aria-label="Navegação principal móvel"
            aria-modal="true"
            role="dialog"
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
              <Link
                to="/notificacoes"
                onClick={() => setMenuAberto(false)}
                className="py-3 px-2 rounded-lg enfase texto-padrao hover-fundo-sutil"
              >
                Notificações
              </Link>
              <Link
                to="/criar-campanha"
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
    </header>
  );
}
