import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { BuscaGlobal } from '../../components/layout/cabecalho/busca-global';
import { LimiteErro } from '../../components/layout/limite-erro';
import { AdminSidebar } from './admin-sidebar';
import { TelaAceiteTermoUso } from '../5-termo-uso/tela-aceite-termo-uso';
import { registrarAcesso } from '../../services/router/acessados-recentemente';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

interface AdminLayoutProps {
  auth: UseAuthReturn;
}

// Casca do painel administrativo: menu lateral (admin-sidebar.tsx: coluna fixa à esquerda a partir de 1377px
// (variação `painel:`, o ponto de quebra declarado no tema; ver admin-sidebar.tsx), gaveta com hambúrguer em telas menores) + área de conteúdo. Cada aba
// (Usuários/Papéis/Configurações) é uma rota de verdade dentro de /admin/* (ver
// services/router/rotas.constants.ts, ROTAS_ADMIN) e renderiza aqui dentro do <Outlet/>: esta casca não sabe
// qual aba está ativa, só monta a moldura.
//
// `auth` é recebido direto para montar <BuscaGlobal/> aqui (o Ctrl+K precisa de authFetch para buscar nos 4
// catálogos). Continua vindo explícito por prop de App.tsx, não por Outlet context; os filhos do <Outlet/>
// continuam recebendo `auth` direto de App.tsx.
export function AdminLayout({ auth }: AdminLayoutProps) {
  const [menuAberto, setMenuAberto] = useState(false);
  const local = useLocation();
  const idUsuario = auth.usuario?.idUsuario;

  // Alimenta "Acessados recentemente" do Dashboard (services/router/acessados-recentemente.ts).
  useEffect(() => {
    if (idUsuario !== undefined) registrarAcesso(idUsuario, local.pathname);
  }, [idUsuario, local.pathname]);

  // Guarda única do painel: sem login, qualquer /admin/* vai para o login, que devolve a pessoa para a página
  // pedida depois de entrar. Só confere se HÁ sessão, não o papel: qualquer conta logada vê o painel, e o que
  // cada papel pode ler ou alterar continua decidido pelo backend (guards do Nest e RLS). Enquanto a sessão
  // salva está sendo restaurada (F5), espera em vez de mandar para o login por engano.
  if (auth.carregando) {
    return null;
  }
  if (!auth.usuario) {
    return <Navigate to="/login" replace state={{ voltarPara: local.pathname + local.search }} />;
  }
  // RF-015: versão nova do Termo de Uso ainda não aceita; o painel volta sozinho depois do aceite.
  if (auth.aceitePendente) {
    return <TelaAceiteTermoUso auth={auth} />;
  }

  return (
    <div className="admin-pagina">
      {/* Faixa como CAMADA DE FUNDO, não um elemento que empurra tudo: a faixa mora POR TRÁS de tudo
          (`absolute`, primeiro filho de `.admin-shell`, que tem `position:relative` em 6-admin-shell.css só
          para servir de âncora para isto), e a sidebar continua no fluxo normal do grid (sem ser empurrada,
          encosta direto no breadcrumb). É o PRÓPRIO fundo opaco da sidebar + vir DEPOIS no HTML
          (painel:relative em admin-sidebar.tsx) que cobre/esconde a faixa atrás dela sozinha, sem
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
            className="paragrafo-destaque flex items-center gap-2 texto-padrao"
          >
            <i className="fa-solid fa-bars"></i> Menu
          </button>
        </div>

        <AdminSidebar aberto={menuAberto} aoFechar={() => setMenuAberto(false)} />

        <div className="admin-content-area">
          <div className="admin-content-area__inner outline-none" data-conteudo-principal tabIndex={-1}>
            {/* Erro numa tela do painel fica só na área de conteúdo: menu lateral e busca continuam usáveis. */}
            <LimiteErro>
              <Outlet />
            </LimiteErro>
          </div>
        </div>
      </div>

      <BuscaGlobal auth={auth} />
    </div>
  );
}
