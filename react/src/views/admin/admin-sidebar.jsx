import { GRUPOS_MENU_ADMIN } from './admin-menu.constants';

// Menu lateral — coluna fixa em telas >=1024px (grid em .admin-shell,
// 2-admin-shell.css), gaveta (drawer) por cima do conteúdo em telas
// menores (padrão de mercado pra sidebar em admin panel: some abaixo de
// ~768-1024px, vira menu-gaveta com um botão de hambúrguer, em vez de
// empilhar acima do conteúdo e empurrar tudo pra baixo).
export function AdminSidebar({ abaAtiva, aoSelecionar, aberto, aoFechar }) {
  const selecionar = (aba) => {
    aoSelecionar(aba);
    aoFechar();
  };

  return (
    <>
      {/* Fundo escuro atrás da gaveta — só existe fechando (clique fora) e só no mobile. */}
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
        <hr className="admin-sidebar__separador" />

        {GRUPOS_MENU_ADMIN.map((grupo) => (
          <div key={grupo.titulo}>
            <div className="admin-sidebar__grupo-titulo">{grupo.titulo}</div>
            {grupo.itens.map((item) => (
              <button
                key={item.aba}
                type="button"
                disabled={item.desabilitado}
                onClick={() => selecionar(item.aba)}
                className={
                  'admin-sidebar__item' +
                  (abaAtiva === item.aba ? ' admin-sidebar__item--ativo' : '') +
                  (item.desabilitado ? ' admin-sidebar__item--desabilitado' : '')
                }
                title={item.desabilitado ? 'Ainda não implementado' : undefined}
              >
                <span>{item.rotulo}</span>
              </button>
            ))}
          </div>
        ))}
      </aside>
    </>
  );
}
