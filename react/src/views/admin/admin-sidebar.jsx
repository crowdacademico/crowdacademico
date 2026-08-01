import { GRUPOS_MENU_ADMIN } from './admin-menu.constants';

// Menu lateral fixo (sticky, ver .admin-sidebar em 4-admin-shell.css) — o
// mesmo em toda a área admin, só troca qual painel aparece à direita.
export function AdminSidebar({ abaAtiva, aoSelecionar }) {
  return (
    <aside className="admin-sidebar">
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
              onClick={() => aoSelecionar(item.aba)}
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
  );
}
