import { useState } from 'react';
import { Outlet } from 'react-router';
import { BuscaGlobal } from '../../components/layout/cabecalho/busca-global';
import { AdminSidebar } from './admin-sidebar';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface AdminLayoutProps {
  auth: UseAuthReturn;
}

// Casca do painel administrativo: menu lateral (admin-sidebar.tsx: coluna fixa à esquerda a partir de 1377px
// (min-[1377px]:, ver comentário completo em admin-sidebar.tsx sobre por que é um valor literal, não um token
// de tema), gaveta com hambúrguer em telas menores) + área de conteúdo. Cada aba
// (Usuários/Papéis/Configurações) é uma rota de verdade dentro de /admin/* (ver
// services/router/rotas.constants.ts, ROTAS_ADMIN) e renderiza aqui dentro do <Outlet/>: esta casca não sabe
// qual aba está ativa, só monta a moldura.
//
// `auth` é recebido direto para montar <BuscaGlobal/> aqui (o Ctrl+K precisa de authFetch para buscar nos 4
// catálogos). Continua vindo explícito por prop de App.tsx, não por Outlet context; os filhos do <Outlet/>
// continuam recebendo `auth` direto de App.tsx.
export function AdminLayout({ auth }: AdminLayoutProps) {
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <main className="admin-pagina">
      {/* Faixa como CAMADA DE FUNDO, não um elemento que empurra tudo: a faixa mora POR TRÁS de tudo
          (`absolute`, primeiro filho de `.admin-shell`, que tem `position:relative` em 6-admin-shell.css só
          para servir de âncora para isto), e a sidebar continua no fluxo normal do grid (sem ser empurrada,
          encosta direto no breadcrumb). É o PRÓPRIO fundo opaco da sidebar + vir DEPOIS no HTML
          (min-[1377px]:relative em admin-sidebar.tsx) que cobre/esconde a faixa atrás dela sozinha, sem
          display/visibility condicional aqui. Só a área de CONTEÚDO (.admin-content-area, padding-top maior,
          ver 6-admin-shell.css) reserva espaço de verdade: é onde a faixa aparece, dando o respiro entre
          breadcrumb e tabela. Como o botão nunca é escondido via CSS (nem hidden, nem invisible), ele fica
          sempre com a MESMA altura natural (sem "salto" de altura), e quando a sidebar vira gaveta (abaixo
          de 1377px) e para de cobrir a faixa, o botão reaparece sozinho, exposto, sem CSS nenhum decidindo
          isso. */}
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
