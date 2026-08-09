import { Link } from 'react-router';
import { ControleFonte } from './controle-fonte';
import { ControleTema } from './controle-tema';
import { DevLoginRapido } from './dev-login-rapido';
import { MenuUsuario } from './menu-usuario';
import { SinoAtividade } from './sino-atividade';

// Cópia fiel de componentes/header.html do Projeto de Interface real
// (mesmas classes Tailwind, mesma estrutura) — único em toda tela
// (App.jsx). Adaptações, porque este React ainda só tem o painel admin
// (home) e a tela de login, nenhuma outra tela pública:
// 1. A marca agora navega de verdade pra "/" (home) — antes era só um
//    alert(), já que "home" não existia como rota.
// 2. "Explorar Projetos"/"Como Funciona"/"Transparência LGPD"/"Submeter
//    Pesquisa" continuam um alert() de placeholder — mesmo espírito do
//    showAction() do protótipo original, que também só simula ação pra
//    seção que não existe ainda.
// 3. "Meu Painel"/"Entrar" (canto direito): logado mostra nome real + Sair;
//    deslogado agora é um link de verdade pra "/login" (era um formulário
//    embutido aqui antes — virou a tela de login própria, ver
//    views/3-auth/login-page.jsx).
function placeholder(mensagem) {
  return () => window.alert(mensagem);
}

export function Header({ auth }) {
  return (
    // `relative` (09-08-2026) — âncora pro DevLoginRapido absoluto lá
    // embaixo, fora do fluxo do grupo da direita de propósito (ver
    // comentário completo perto dele).
    <header className="fundo-cartao border-b borda-padrao sticky top-0 z-50 shadow-sm relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white font-bold shadow-inner">
            <i className="fa-solid fa-flask"></i>
          </div>
          <span className="font-bold text-xl tracking-tight texto-forte hidden sm:block">
            CrowdAcadêmico
          </span>
        </Link>

        {/*
          TEMPORÁRIO (pedido do Lucas, 01-08-2026): escondido de propósito
          até essas 3 seções existirem de verdade (home pública, "como
          funciona", transparência LGPD). Quando a view de cada uma for
          construída, a IA deve tirar o bloco abaixo do comentário — não
          é pra ficar escondido pra sempre, só até ter destino real.

        <nav className="hidden md:flex space-x-8 h-full">
          <button
            onClick={placeholder('Explorar Projetos ainda não existe neste protótipo.')}
            className="text-dark font-bold border-b-2 border-primary h-full flex items-center"
          >
            Explorar Projetos
          </button>
          <button
            onClick={placeholder('Seção "Como Funciona" simulada para o protótipo.')}
            className="text-slate-600 hover:text-dark font-medium h-full flex items-center transition-colors"
          >
            Como Funciona
          </button>
          <button
            onClick={placeholder('Seção "Transparência LGPD" simulada para o protótipo.')}
            className="text-slate-600 hover:text-dark font-medium h-full flex items-center transition-colors"
          >
            Transparência LGPD
          </button>
        </nav>
        */}

        {/* Organização do cabeçalho (09-08-2026, pedido do Lucas — começando
            a arrumar por aqui): "Submeter Pesquisa" é o item mais à
            esquerda deste grupo, com um respiro grande (mr-10, além do
            gap-3 normal) antes dos controles de fonte/tema. MenuUsuario
            (o ícone de login/avatar) precisa ficar no CANTO de verdade —
            por isso DevLoginRapido saiu de dentro deste `flex`
            inteiramente (ver logo abaixo): ficar aqui dentro, mesmo por
            último, alargava o grupo inteiro (por causa do `ml-20` dele) e
            o `justify-between` do cabeçalho empurrava tudo pra esquerda
            junto — o login acabava sobrando no meio da tela, longe do
            canto, exatamente o problema que o Lucas reportou. */}
        <div className="flex items-center gap-3">
          <button
            onClick={placeholder('Submeter Pesquisa ainda não existe neste protótipo.')}
            className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg font-bold transition-all text-sm shadow-md hidden lg:block mr-10"
          >
            Submeter Pesquisa
          </button>

          <ControleFonte />
          <ControleTema />

          {/* Sino só faz sentido logado — "atividade recente" é sempre de
              alguém (09-08-2026, Bloco B/C). */}
          {auth.autenticado && <SinoAtividade auth={auth} />}

          <MenuUsuario auth={auth} />
        </div>
      </div>

      {/* DevLoginRapido posicionado ABSOLUTO, fora do grupo acima de
          propósito (09-08-2026) — assim ele pode ir "mais pra direita"
          (inclusive na faixa de padding do cabeçalho) sem influenciar a
          posição de mais nada: o `justify-between` de cima só enxerga o
          grupo normal (Submeter Pesquisa...MenuUsuario), que continua
          exatamente no canto dele, do jeito que sempre foi. */}
      {!auth.autenticado && !auth.carregando && (
        <div className="absolute top-1/2 -translate-y-1/2 right-1 sm:right-2">
          <DevLoginRapido auth={auth} />
        </div>
      )}
    </header>
  );
}
