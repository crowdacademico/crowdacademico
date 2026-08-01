import { LoginForm } from '../3-auth/login-form';

// Cabeçalho único do site — mesmo em toda tela (App.jsx), igual ao
// componentes/header.html do Projeto de Interface real. Por enquanto só
// mostra marca + sessão (login/usuário logado); os links de navegação
// pública (Explorar Projetos, Como Funciona) do protótipo ficam de fora até
// essas telas existirem de verdade neste React — sem link morto.
export function Header({ auth }) {
  return (
    <header className="site-header">
      <div className="site-header__conteudo">
        <div className="site-header__marca">
          <div className="site-header__logo">CA</div>
          <span className="site-header__nome">CrowdAcadêmico</span>
        </div>

        <div className="site-header__sessao">
          {auth.carregando ? (
            <span className="site-header__usuario">Carregando sessão...</span>
          ) : auth.autenticado ? (
            <>
              <span className="site-header__usuario">
                <strong>{auth.usuario?.nome ?? 'logado'}</strong> ({auth.usuario?.email})
              </span>
              <button className="site-header__botao-sair" onClick={auth.logout}>
                Sair
              </button>
            </>
          ) : (
            <LoginForm login={auth.login} />
          )}
        </div>
      </div>
    </header>
  );
}
