import { NavLink } from 'react-router';
import { abrirBuscaGlobal } from '../../components/layout/busca-global-evento';
import { GRUPOS_MENU_ADMIN } from './admin-menu.constants';

// Menu lateral — coluna fixa em telas >=1024px (grid em .admin-shell,
// 3-admin-shell.css), gaveta (drawer) por cima do conteúdo em telas
// menores. Itens com `caminho` são NavLink de verdade (URL muda, dá pra
// linkar direto, botão Voltar funciona, F5 mantém a aba) — item ativo é
// quem o próprio NavLink decide, comparando com a URL atual, não um
// state comparado à mão.
export function AdminSidebar({ aberto, aoFechar }) {
  return (
    <>
      {/* Fundo escuro atrás da gaveta — só existe abrindo (clique fora) e só no mobile. */}
      {aberto && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={aoFechar}
          aria-hidden="true"
        />
      )}

      <aside
        className={
          'admin-sidebar fixed top-16 bottom-0 left-0 z-40 w-[260px] overflow-y-auto ' +
          'transition-transform duration-200 lg:static lg:top-auto lg:bottom-auto lg:z-auto ' +
          'lg:w-auto lg:translate-x-0 ' +
          (aberto ? 'translate-x-0' : '-translate-x-full')
        }
      >
        <div className="admin-sidebar__titulo">Painel Administrativo</div>
        <div className="admin-sidebar__subtitulo">CrowdAcadêmico</div>

        {/* Busca global (09-08-2026) — Ctrl+K abre de qualquer lugar, mas
            um atalho sozinho não é descobrível; este botão é a pista
            visível de que ele existe (ver components/layout/
            busca-global.jsx). */}
        <button
          type="button"
          onClick={abrirBuscaGlobal}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 my-3 rounded-md border border-slate-300 bg-slate-50 text-sm text-slate-500 hover:bg-slate-200 transition-colors"
        >
          <span className="flex items-center gap-2">
            <i className="fa-solid fa-magnifying-glass"></i> Buscar
          </span>
          <kbd className="text-[10px] font-bold border border-slate-300 rounded px-1.5 py-0.5 bg-white">
            Ctrl K
          </kbd>
        </button>

        <hr className="admin-sidebar__separador" />

        {GRUPOS_MENU_ADMIN.map((grupo) => (
          <div key={grupo.titulo ?? 'sem-titulo'}>
            {/* Dashboard (08-08-2026) é um grupo sem título — item solo,
                não uma seção de cadastro — só ganha a linha divisória
                embaixo (divisorApos), não o rótulo maiúsculo de grupo. */}
            {grupo.titulo && <div className="admin-sidebar__grupo-titulo">{grupo.titulo}</div>}
            {grupo.itens.map((item) =>
              item.desabilitado ? (
                <button
                  key={item.rotulo}
                  type="button"
                  disabled
                  className="admin-sidebar__item admin-sidebar__item--desabilitado"
                  title="Ainda não implementado"
                >
                  <span>{item.rotulo}</span>
                </button>
              ) : (
                <NavLink
                  key={item.caminho}
                  to={item.caminho}
                  onClick={aoFechar}
                  className={({ isActive }) =>
                    'admin-sidebar__item' + (isActive ? ' admin-sidebar__item--ativo' : '')
                  }
                >
                  <span>{item.rotulo}</span>
                </NavLink>
              ),
            )}
            {grupo.divisorApos && <hr className="admin-sidebar__separador" />}
          </div>
        ))}
      </aside>
    </>
  );
}
