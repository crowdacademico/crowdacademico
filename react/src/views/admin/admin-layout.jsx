import { useState } from 'react';
import { Outlet } from 'react-router';
import { BuscaGlobal } from '../../components/layout/busca-global';
import { AdminSidebar } from './admin-sidebar';

// Casca do painel administrativo — menu lateral (admin-sidebar.jsx: coluna
// fixa à esquerda a partir de 1377px (min-[1377px]:, ver comentário
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
      {/* Faixa como CAMADA DE FUNDO, não mais um elemento que empurra tudo
          (25-08-2026, 3ª tentativa — as duas primeiras, "some/aparece" e
          depois "sempre visível mas invisível", ambas empurravam a
          sidebar pra baixo também, o que o Lucas NÃO queria: "a sidebar
          sempre encostou direto no breadcrumb, quero que continue assim").
          Ideia nova, descrita pelo próprio Lucas: a faixa mora POR TRÁS
          de tudo (`absolute`, primeiro filho de `.admin-shell` — que
          ganhou `position:relative` em 3-admin-shell.css só pra servir de
          âncora pra isto), a sidebar continua no fluxo normal do grid
          (sem ser empurrada, encosta direto no breadcrumb como sempre),
          e é o PRÓPRIO fundo opaco dela + vir DEPOIS no HTML
          (min-[1377px]:relative em admin-sidebar.jsx) que cobre/esconde a
          faixa atrás dela sozinha, sem precisar de display/visibility
          condicional nenhum aqui. Só a área de CONTEÚDO (.admin-content-
          area, padding-top maior, ver 3-admin-shell.css) reserva espaço
          de verdade — é onde a faixa aparece, dando aquele respiro entre
          breadcrumb e tabela que o Lucas pediu desde o início. Bônus:
          como o botão nunca mais é escondido via CSS (nem hidden, nem
          invisible), ele fica sempre com a MESMA altura natural — o
          "salto" de altura que rolou nas tentativas anteriores nem pode
          mais acontecer, e quando a sidebar vira gaveta (abaixo de
          1377px) e para de cobrir a faixa, o botão reaparece sozinho,
          exposto, sem CSS nenhum decidindo isso — é simplesmente o que já
          estava lá o tempo todo, só que agora visível. */}
      <div className="admin-shell">
        <div className="absolute inset-x-0 top-0 flex items-center px-4 py-3 fundo-cartao border-b borda-padrao">
          <button
            type="button"
            onClick={() => setMenuAberto(true)}
            className="flex items-center gap-2 font-semibold text-sm texto-padrao"
          >
            <i className="fa-solid fa-bars"></i> Menu
          </button>
        </div>

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
