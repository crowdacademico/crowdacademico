import { useState } from 'react';
import { Outlet } from 'react-router';
import { BuscaGlobal } from '../../components/layout/busca-global';
import { AdminSidebar } from './admin-sidebar';

// Casca do painel administrativo — menu lateral (admin-sidebar.jsx: coluna
// fixa à esquerda a partir de 1310px (min-[1310px]:, ver comentário
// completo em admin-sidebar.jsx sobre por que é um valor literal, não um
// token de tema), gaveta com hambúrguer em telas menores) + área de
// conteúdo. Cada aba (Usuários/Papéis/Configurações) é
// uma rota de verdade dentro de /admin/* (ver services/router/
// rotas.constants.js, ROTAS_ADMIN) e renderiza aqui dentro do <Outlet/> —
// esta casca não sabe qual aba está ativa, só monta a moldura.
//
// `auth` (09-08-2026) passou a ser recebido direto — precisou pra montar
// <BuscaGlobal/> aqui (o Ctrl+K precisa de authFetch pra buscar nos 4
// catálogos). Continua vindo explícito por prop de App.jsx, não por
// Outlet context — mesmo padrão de sempre, só que agora AdminLayout
// também usa, não só repassa pros filhos do <Outlet/> (que continuam
// recebendo `auth` direto de App.jsx, sem mudança).
export function AdminLayout({ auth }) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <main className="admin-pagina">
      {/* Só aparece abaixo de 1310px (25-08-2026, ver admin-sidebar.jsx)
          — em telas maiores o menu já é uma coluna fixa (ver .admin-sidebar
          em 3-admin-shell.css), não precisa de botão. */}
      <button
        type="button"
        onClick={() => setMenuAberto(true)}
        className="min-[1310px]:hidden flex items-center gap-2 px-4 py-3 fundo-cartao border-b borda-padrao font-semibold text-sm texto-padrao w-full"
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

      <BuscaGlobal auth={auth} />
    </main>
  );
}
