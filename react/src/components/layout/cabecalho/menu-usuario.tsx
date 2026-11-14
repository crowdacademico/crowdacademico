import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { AvatarUsuario } from '../avatar-usuario';
import { useFecharAoClicarFora } from '../../../services/constant/hook/use-fechar-ao-clicar-fora';
import type { UseAuthReturn } from '../../../services/3-auth/hook/use-auth';

interface MenuUsuarioProps {
  auth: Pick<UseAuthReturn, 'carregando' | 'autenticado' | 'usuario' | 'podeAcessarPainelAdmin' | 'logout'>;
}

// Dropdown do cabeçalho: avatar NÃO substitui os controles soltos (fonte, tema, sino), só guarda
// identidade/conta, mesmo padrão GitHub/Linear/Notion.
//
// "Minha Conta" linka para /minha-conta: a seção "Preferências" de lá cobre o que seria um item "Configurações"
// à parte, por isso ele não existe aqui.
export function MenuUsuario({ auth }: MenuUsuarioProps) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useFecharAoClicarFora(containerRef, aberto, () => setAberto(false));

  if (auth.carregando) {
    return <span className="paragrafo texto-fraco">Carregando sessão...</span>;
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        aria-label="Menu da conta"
        className="flex items-center gap-1.5 hover-fundo-sutil rounded-full p-0.5 transition-colors"
      >
        {auth.autenticado ? (
          <AvatarUsuario nome={auth.usuario?.nome} foto={auth.usuario?.avatarUrl} />
        ) : (
          <div className="w-9 h-9 rounded-full fundo-sutil border borda-padrao flex items-center justify-center texto-fraco">
            <i className="fa-solid fa-user" aria-hidden="true"></i>
          </div>
        )}
        <i className="fa-solid fa-chevron-down icone-pequeno texto-fraco" aria-hidden="true"></i>
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-64 fundo-elevado rounded-xl shadow-2xl border borda-forte overflow-hidden z-50">
          {auth.autenticado ? (
            <>
              <div className="px-4 py-3 border-b borda-padrao fundo-sutil">
                <p className="paragrafo enfase texto-forte truncate">{auth.usuario?.nome}</p>
                <p className="legenda texto-fraco truncate">{auth.usuario?.email}</p>
              </div>

              <Link
                to="/minha-conta/perfil"
                onClick={() => setAberto(false)}
                className="paragrafo enfase flex items-center gap-3 px-4 py-2.5 texto-padrao hover-fundo-sutil transition-colors"
              >
                <i className="fa-solid fa-user w-4" aria-hidden="true"></i>
                Minha Conta
              </Link>
              <Link
                to="/notificacoes"
                onClick={() => setAberto(false)}
                className="paragrafo enfase flex items-center gap-3 px-4 py-2.5 texto-padrao hover-fundo-sutil transition-colors"
              >
                <i className="fa-solid fa-bell w-4" aria-hidden="true"></i>
                Notificações
              </Link>
              {auth.usuario?.ehPesquisador ? (
                <Link
                  to="/estudio-pesquisador"
                  onClick={() => setAberto(false)}
                  className="paragrafo enfase flex items-center gap-3 px-4 py-2.5 texto-padrao hover-fundo-sutil transition-colors"
                >
                  <i className="fa-solid fa-flask w-4" aria-hidden="true"></i>
                  Estúdio do pesquisador
                </Link>
              ) : (
                <div className="px-4 py-2.5" aria-label="Estúdio do pesquisador indisponível">
                  <button
                    type="button"
                    disabled
                    className="paragrafo enfase flex items-center gap-3 texto-fraco w-full text-left cursor-not-allowed"
                  >
                    <i className="fa-solid fa-flask w-4" aria-hidden="true"></i>
                    Estúdio do pesquisador
                  </button>
                  <p className="legenda texto-fraco mt-1 pl-7">
                    Acesso exclusivo para pesquisadores. Faça upgrade da conta para acessar.
                  </p>
                  <Link
                    to="/minha-conta/perfil"
                    onClick={() => setAberto(false)}
                    className="legenda texto-marca hover:underline mt-2 ml-7 inline-block"
                  >
                    Fazer upgrade
                  </Link>
                </div>
              )}

              {auth.podeAcessarPainelAdmin && (
                <>
                  <div className="border-t borda-padrao"></div>
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setAberto(false)}
                    className="paragrafo enfase flex items-center gap-3 px-4 py-2.5 texto-marca hover-fundo-sutil transition-colors"
                  >
                    <i className="fa-solid fa-shield-halved w-4" aria-hidden="true"></i>
                    Painel Admin
                  </Link>
                </>
              )}

              <div className="border-t borda-padrao"></div>
              <button
                type="button"
                onClick={auth.logout}
                className="paragrafo enfase w-full flex items-center gap-3 px-4 py-2.5 texto-erro hover-fundo-sutil transition-colors text-left"
              >
                <i className="fa-solid fa-right-from-bracket w-4" aria-hidden="true"></i>
                Sair da Conta
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setAberto(false)}
                className="paragrafo enfase flex items-center gap-3 px-4 py-2.5 texto-padrao hover-fundo-sutil transition-colors"
              >
                <i className="fa-solid fa-right-to-bracket w-4" aria-hidden="true"></i>
                Entrar
              </Link>
              <Link
                to="/cadastro"
                onClick={() => setAberto(false)}
                className="paragrafo enfase flex items-center gap-3 px-4 py-2.5 texto-marca hover-fundo-sutil transition-colors"
              >
                <i className="fa-solid fa-user-plus w-4" aria-hidden="true"></i>
                Cadastre-se
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
