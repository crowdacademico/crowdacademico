import { useState } from 'react';
import { useNavigate } from 'react-router';

// <dev> — login instantâneo com uma conta que JÁ existe no seed
// (07_seed_dados.sql, [07-D-1]), sem digitar nada. Existe só porque logar
// como admin toda hora pra testar o painel era chato (pedido do Lucas,
// 03-08-2026) — não cria conta nem senha nova, só reaproveita a senha de
// dev que já é a mesma pros 17 usuários seedados (ver
// temp_Nest_React.md, "Seed tinha senha_hash falso"). Clique no rótulo:
// entra como Admin direto. Seta: abre a lista de contas — só Admin por
// enquanto, mas já pronta pra crescer (pesquisador, moderador...) sem
// precisar redesenhar nada.
const CONTAS_DEV = [
  { rotulo: 'Admin', email: 'admin@crowdacademico.com.br', senha: 'DevTcc123!' },
];

export function DevLoginRapido({ auth }) {
  const navigate = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);
  const [entrando, setEntrando] = useState(false);

  const entrarComo = async (conta) => {
    setMenuAberto(false);
    setEntrando(true);
    try {
      await auth.login(conta.email, conta.senha);
      navigate('/');
    } catch {
      // Silencioso de propósito — é atalho de dev, não vale poluir a tela
      // com erro se a senha do seed tiver sido trocada por alguém; a
      // pessoa simplesmente continua deslogada, pode entrar do jeito normal.
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div
      className="relative ml-8"
      onBlur={(evento) => {
        if (!evento.currentTarget.contains(evento.relatedTarget)) {
          setMenuAberto(false);
        }
      }}
    >
      <div className="flex">
        <button
          type="button"
          onClick={() => entrarComo(CONTAS_DEV[0])}
          disabled={entrando}
          className="btn-dev"
        >
          &lt;dev&gt; {entrando ? 'Entrando...' : 'Entrar como Admin'}
        </button>
        <button
          type="button"
          onClick={() => setMenuAberto((atual) => !atual)}
          aria-label="Mais contas de desenvolvimento"
          className="btn-dev btn-dev--seta"
        >
          <i className="fa-solid fa-chevron-down"></i>
        </button>
      </div>

      {menuAberto && (
        <div className="absolute right-0 mt-1 w-56 bg-white border-2 border-dashed border-purple-300 rounded-lg shadow-lg z-50 overflow-hidden">
          {CONTAS_DEV.map((conta) => (
            <button
              key={conta.email}
              type="button"
              onClick={() => entrarComo(conta)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50"
            >
              {conta.rotulo}
              <span className="block text-slate-400 text-xs">{conta.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
