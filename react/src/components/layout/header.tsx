import { Link } from 'react-router';
import { ControleFonte } from './cabecalho/controle-fonte';
import { ControleTema } from './cabecalho/controle-tema';
import { DevLoginRapido } from './cabecalho/dev-login-rapido';
import { MenuUsuario } from './cabecalho/menu-usuario';
import { SinoAtividade } from './cabecalho/sino-atividade';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

// Cópia fiel de componentes/header.html do Projeto de Interface real (mesmas classes Tailwind, mesma
// estrutura), único em toda tela (App.tsx). Adaptações, porque este React só tem o painel admin (home) e a tela
// de login, nenhuma outra tela pública:
// 1. A marca navega de verdade para "/" (home).
// 2. "Submeter Pesquisa" abre o Criar Campanha em Minhas Campanhas (`?criar=1`), só em desenvolvimento. Quem não é pesquisador cai na
// mesma página, que explica por que não pode criar; quem não está logado passa pelo login antes.
// 3. "Meu Painel"/"Entrar" (canto direito): logado mostra nome real + Sair; deslogado é um link de verdade para
// "/login" (views/3-auth/login-page.tsx).

interface HeaderProps {
  auth: UseAuthReturn;
}

export function Header({ auth }: HeaderProps) {
  return (
    // `relative`: âncora para o DevLoginRapido absoluto lá embaixo, fora do fluxo do grupo da direita de
    // propósito (ver comentário completo perto dele).
    <header className="fundo-cartao border-b borda-padrao sticky top-0 z-50 shadow-sm relative">
      <div className="largura-site h-16 flex items-center justify-between">
        {/* Espelho da marca do <footer>: mesmo tamanho (w-10 h-10 / text-2xl) e mesma caixa (.largura-site),
            então as duas ficam na mesma linha vertical em qualquer tela. */}
        <Link to="/" className="flex items-center gap-3" aria-label="CrowdAcadêmico, página inicial">
          <div className="w-10 h-10 fundo-marca rounded-lg flex items-center justify-center texto-sobre-cor shadow-inner">
            <i className="fa-solid fa-flask" aria-hidden="true"></i>
          </div>
          <span className="titulo-secao hidden sm:block">
            CrowdAcadêmico
          </span>
        </Link>

        {/* "Submeter Pesquisa" é o item mais à esquerda deste grupo, com um respiro grande (mr-10, além do
            gap-3 normal) antes dos controles de fonte/tema. MenuUsuario (o ícone de login/avatar) precisa
            ficar no CANTO de verdade: por isso DevLoginRapido fica fora deste `flex` (ver logo abaixo):
            dentro dele, mesmo por último, alargaria o grupo inteiro e o `justify-between` do cabeçalho
            empurraria tudo para a esquerda junto, deixando o login sobrando no meio da tela, longe do canto. */}
        <div className="flex items-center gap-3">
          {/* Por enquanto abre Minhas Campanhas da área de testes, que só existe em desenvolvimento. */}
          {import.meta.env.DEV && (
            <Link
              to="/admin/campo-testes/minhas-campanhas?criar=1"
              className="btn btn-primary btn-destaque hidden lg:inline-flex mr-10"
            >
              Submeter Pesquisa
            </Link>
          )}

          <ControleFonte />
          <ControleTema />

          {/* Sino só faz sentido logado: "atividade recente" é sempre de alguém. */}
          {auth.autenticado && !auth.aceitePendente && <SinoAtividade auth={auth} />}

          <MenuUsuario auth={auth} />
        </div>
      </div>

      {/* DevLoginRapido posicionado ABSOLUTO, fora do grupo acima de propósito: assim ele pode ir "mais para
          a direita" (inclusive na faixa de padding do cabeçalho) sem influenciar a posição de mais nada: o
          `justify-between` de cima só enxerga o grupo normal (Submeter Pesquisa...MenuUsuario), que continua
          exatamente no canto dele.

          import.meta.env.DEV: mesmo tratamento da área de testes: some sozinho em qualquer `npm run build`,
          continua disponível em `npm run dev`. Sem isso, o botão iria para o build de produção também, e
          qualquer link público (deploy de teste, preview, demonstração para banca) exporia login instantâneo
          como admin com uma senha de seed conhecida, sem digitar nada. Ver `DOCUMENTACAO_FRONTEND.md`, seção
          9, nota sobre `DevLoginRapido`. */}
      {import.meta.env.DEV && !auth.autenticado && !auth.carregando && (
        <div className="absolute top-1/2 -translate-y-1/2 right-1 sm:right-2">
          <DevLoginRapido auth={auth} />
        </div>
      )}
    </header>
  );
}
