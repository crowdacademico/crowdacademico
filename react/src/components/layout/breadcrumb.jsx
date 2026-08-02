import { Link, useLocation } from 'react-router';
import { ROTAS } from '../../services/router/rotas.constants';

// Rótulos vêm de services/router/rotas.constants.js — mesma fonte que
// App.jsx usa pras rotas, nunca uma lista own separada (era assim antes;
// duas listas cresciam juntas só se alguém lembrasse dos dois lugares).
const ROTULOS_ROTA = Object.fromEntries(
  ROTAS.filter((rota) => rota.rotuloBreadcrumb).map((rota) => [rota.caminho, rota.rotuloBreadcrumb]),
);

// Aparece embaixo do cabeçalho em toda página que NÃO for a home (o
// painel admin, temporariamente) — só um jeito rápido de voltar. Escondido
// de propósito na home, senão ficaria um "Início" apontando pra própria
// página que já está aberta.
export function Breadcrumb() {
  const location = useLocation();

  if (location.pathname === '/') {
    return null;
  }

  const rotulo = ROTULOS_ROTA[location.pathname] ?? location.pathname;

  return (
    <nav className="bg-slate-100 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-sm">
        <Link to="/" className="text-primary font-bold hover:underline">
          Início
        </Link>
        <i className="fa-solid fa-chevron-right text-slate-400 text-xs"></i>
        <span className="text-slate-600 font-medium">{rotulo}</span>
      </div>
    </nav>
  );
}
