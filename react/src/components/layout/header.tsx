import { Link } from 'react-router';
import { ControleFonte } from './cabecalho/controle-fonte';
import { ControleTema } from './cabecalho/controle-tema';
import { DevLoginRapido } from './cabecalho/dev-login-rapido';
import { MenuUsuario } from './cabecalho/menu-usuario';
import { SinoAtividade } from './cabecalho/sino-atividade';
import { LogoMarca } from './logo-marca';
import type { UseAuthReturn } from '../../services/3-auth/hook/use-auth';

// Cópia fiel de componentes/header.html do Projeto de Interface real (mesmas classes Tailwind, mesma
// estrutura), único em toda tela (App.tsx). Adaptações, porque este React só tem o painel admin (home) e a tela
// de login, nenhuma outra tela pública:
// 1. A marca navega de verdade para "/" (home).
// 2. "Meu Painel"/"Entrar" (canto direito): logado mostra nome real + Sair; deslogado é um link de verdade para
// "/login" (views/3-auth/login-page.tsx).

interface HeaderProps {
  auth: UseAuthReturn;
}

export function Header({ auth }: HeaderProps) {
  return (
    // `relative`: âncora para o DevLoginRapido absoluto lá embaixo, fora do fluxo do grupo da direita de
    // propósito (ver comentário completo perto dele).
    <header data-topo-fixo className="fundo-cartao border-b borda-padrao sticky top-0 z-50 shadow-sm relative">
      <div className="largura-site h-16 flex items-center justify-between">
        {/* Espelho da marca do <footer>: o mesmo LogoMarca e a mesma caixa (.largura-site), então as duas ficam na
            mesma linha vertical em qualquer tela. */}
        <Link to="/" className="flex items-center gap-3" aria-label="CrowdAcadêmico, página inicial">
          <LogoMarca />
          <span className="titulo-secao hidden sm:block">
            CrowdAcadêmico
          </span>
        </Link>

        {/* MenuUsuario (o ícone de login/avatar) precisa
            ficar no CANTO de verdade: por isso DevLoginRapido fica fora deste `flex` (ver logo abaixo):
            dentro dele, mesmo por último, alargaria o grupo inteiro e o `justify-between` do cabeçalho
            empurraria tudo para a esquerda junto, deixando o login sobrando no meio da tela, longe do canto. */}
        <div className="flex items-center gap-3">
          <ControleFonte />
          <ControleTema />

          {/* Sino só faz sentido logado: "atividade recente" é sempre de alguém. */}
          {auth.autenticado && !auth.aceitePendente && <SinoAtividade auth={auth} />}

          <MenuUsuario auth={auth} />
        </div>
      </div>

      {/* DevLoginRapido posicionado ABSOLUTO, fora do grupo acima de propósito: assim ele pode ir "mais para
          a direita" (inclusive na faixa de padding do cabeçalho) sem influenciar a posição de mais nada: o
          `justify-between` de cima só enxerga o grupo normal (fonte, tema, sino e MenuUsuario), que continua
          exatamente no canto dele. Abaixo de `--breakpoint-dev-login` (tailwind-theme.css) não sobra espaço à direita e
          ele cobriria o ícone de login: desce para logo abaixo do cabeçalho.

          import.meta.env.DEV: mesmo tratamento da área de testes: some sozinho em qualquer `npm run build`,
          continua disponível em `npm run dev`. Sem isso, o botão iria para o build de produção também, e
          qualquer link público (deploy de teste, preview, demonstração para banca) exporia login instantâneo
          como admin com uma senha de seed conhecida, sem digitar nada. Ver `DOCUMENTACAO_FRONTEND.md`, seção
          9, nota sobre `DevLoginRapido`. */}
      {import.meta.env.DEV && !auth.autenticado && !auth.carregando && (
        <div className="absolute top-full mt-2 right-1 sm:right-2 dev-login:top-1/2 dev-login:mt-0 dev-login:-translate-y-1/2">
          <DevLoginRapido auth={auth} />
        </div>
      )}
    </header>
  );
}
