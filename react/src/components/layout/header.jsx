import { Link } from 'react-router';
import { DevLoginRapido } from './dev-login-rapido';

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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center text-white font-bold shadow-inner">
            <i className="fa-solid fa-flask"></i>
          </div>
          <span className="font-bold text-xl tracking-tight text-dark hidden sm:block">
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
            className="text-slate-500 hover:text-dark font-medium h-full flex items-center transition-colors"
          >
            Como Funciona
          </button>
          <button
            onClick={placeholder('Seção "Transparência LGPD" simulada para o protótipo.')}
            className="text-slate-500 hover:text-dark font-medium h-full flex items-center transition-colors"
          >
            Transparência LGPD
          </button>
        </nav>
        */}

        <div className="flex items-center gap-4">
          <button
            onClick={placeholder('Submeter Pesquisa ainda não existe neste protótipo.')}
            className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-lg font-bold transition-all text-sm shadow-md hidden lg:block"
          >
            Submeter Pesquisa
          </button>

          {auth.carregando ? (
            <span className="text-sm text-slate-500">Carregando sessão...</span>
          ) : auth.autenticado ? (
            <>
              <span className="bg-slate-100 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center gap-2">
                <i className="fa-solid fa-circle-user text-slate-500"></i>
                {auth.usuario?.nome ?? 'Meu Painel'}
              </span>
              <button
                onClick={auth.logout}
                className="text-slate-600 hover:text-dark font-semibold text-sm transition-colors"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-slate-600 hover:text-dark font-semibold text-sm transition-colors"
              >
                Entrar
              </Link>
              <DevLoginRapido auth={auth} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
