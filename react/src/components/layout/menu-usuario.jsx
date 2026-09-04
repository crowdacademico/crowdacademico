import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AvatarUsuario } from './avatar-usuario';

function placeholder(mensagem) {
  return () => window.alert(mensagem);
}

// Dropdown do cabeçalho (09-08-2026, Bloco B/C do prompt do Claude Web) -
// substitui o antigo bloco solto "nome + Sair"/"Entrar". Recomendação do
// Claude Web adotada: avatar NÃO substitui os controles soltos (fonte,
// tema, sino) - só guarda identidade/conta, mesmo padrão GitHub/Linear/
// Notion.
//
// "Minha Conta" (09-08-2026, Bloco E) já linka pra /minha-conta de
// verdade - a seção "Preferências" de lá cobre o que seria um item
// "Configurações" à parte, por isso ele não existe mais aqui (item
// duplicado sem necessidade). "Notificações" fica placeholder até
// 26-notificacao existir - o sino ao lado já cobre "o que aconteceu
// recentemente" nesse meio tempo.
export function MenuUsuario({ auth }) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!aberto) {
      return undefined;
    }
    const aoClicarFora = (evento) => {
      if (containerRef.current && !containerRef.current.contains(evento.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  if (auth.carregando) {
    return <span className="text-sm texto-fraco">Carregando sessão...</span>;
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
            <i className="fa-solid fa-user"></i>
          </div>
        )}
        <i className="fa-solid fa-chevron-down text-xs texto-fraco"></i>
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-64 fundo-elevado rounded-xl shadow-2xl border borda-forte overflow-hidden z-50">
          {auth.autenticado ? (
            <>
              <div className="px-4 py-3 border-b borda-padrao fundo-sutil">
                <p className="text-sm font-bold texto-forte truncate">{auth.usuario?.nome}</p>
                <p className="text-xs texto-fraco truncate">{auth.usuario?.email}</p>
              </div>

              <Link
                to="/admin/minha-conta"
                onClick={() => setAberto(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold texto-padrao hover-fundo-sutil transition-colors"
              >
                <i className="fa-solid fa-user w-4"></i>
                Minha Conta
              </Link>
              <ItemMenu
                icone="fa-bell"
                rotulo="Notificações"
                onClick={placeholder(
                  'Módulo de notificações ainda não existe, veja "Atividade recente" no sino ao lado.',
                )}
              />

              {auth.ehAdmin && (
                <>
                  <div className="border-t borda-padrao"></div>
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setAberto(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-primary hover-fundo-sutil transition-colors"
                  >
                    <i className="fa-solid fa-shield-halved w-4"></i>
                    Painel Admin
                  </Link>
                </>
              )}

              <div className="border-t borda-padrao"></div>
              <button
                type="button"
                onClick={auth.logout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold texto-erro hover-fundo-sutil transition-colors text-left"
              >
                <i className="fa-solid fa-right-from-bracket w-4"></i>
                Sair da Conta
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setAberto(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold texto-padrao hover-fundo-sutil transition-colors"
              >
                <i className="fa-solid fa-right-to-bracket w-4"></i>
                Entrar
              </Link>
              <Link
                to="/cadastro"
                onClick={() => setAberto(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-primary hover-fundo-sutil transition-colors"
              >
                <i className="fa-solid fa-user-plus w-4"></i>
                Cadastre-se
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ItemMenu({ icone, rotulo, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold texto-padrao hover-fundo-sutil transition-colors text-left"
    >
      <i className={'fa-solid ' + icone + ' w-4'}></i>
      {rotulo}
    </button>
  );
}
