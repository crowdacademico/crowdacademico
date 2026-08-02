import { useState } from 'react';
import { Outlet } from 'react-router';
import { AdminSidebar } from './admin-sidebar';

// Casca do painel administrativo — menu lateral (admin-sidebar.jsx: coluna
// fixa à esquerda em telas >=1024px, gaveta com hambúrguer em telas
// menores) + área de conteúdo. Cada aba (Usuários/Papéis/Configurações) é
// uma rota de verdade dentro de /admin/* (ver services/router/
// rotas.constants.js, ROTAS_ADMIN) e renderiza aqui dentro do <Outlet/> —
// esta casca não sabe qual aba está ativa, só monta a moldura. `auth` não
// precisa descer por Outlet context: App.jsx já passa `auth` direto pra
// cada elemento de rota (mesmo padrão de LoginPage/CriarUsuario).
export function AdminLayout() {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <main className="admin-pagina">
      {/* Só aparece <1024px — em telas maiores o menu já é uma coluna fixa
          (ver .admin-sidebar em 3-admin-shell.css), não precisa de botão. */}
      <button
        type="button"
        onClick={() => setMenuAberto(true)}
        className="lg:hidden flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200 font-semibold text-sm text-slate-700 w-full"
      >
        <i className="fa-solid fa-bars"></i> Menu
      </button>

      <div className="admin-shell">
        <AdminSidebar aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />

        <div className="admin-content-area">
          <div className="admin-content-area__inner">
            <Outlet />
          </div>
        </div>
      </div>
    </main>
  );
}
