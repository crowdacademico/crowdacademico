import { Link, useLocation } from 'react-router';
import { ROTAS, ROTAS_ADMIN } from '../../services/router/rotas.constants';

// Rótulos vêm de services/router/rotas.constants.js (ROTAS + ROTAS_ADMIN)
// — mesma fonte que App.jsx usa pras rotas e admin-menu.constants.js usa
// pro menu lateral, nunca uma lista própria separada.
const TODAS_AS_ROTAS = [...ROTAS, ...ROTAS_ADMIN];

// Aparece embaixo do cabeçalho em toda página cujo rotuloBreadcrumb não
// seja null — só um jeito rápido de voltar. A aba padrão do admin
// (/admin/usuarios) tem rotuloBreadcrumb: null de propósito: mostrar
// "Início > Usuários" ali seria redundante com o próprio link "Início".
export function Breadcrumb() {
  const location = useLocation();

  const rota = TODAS_AS_ROTAS.find((r) => r.caminho === location.pathname);
  if (!rota?.rotuloBreadcrumb) {
    return null;
  }

  return (
    <nav className="bg-slate-100 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-sm">
        <Link to="/" className="text-primary font-bold hover:underline">
          Início
        </Link>
        <i className="fa-solid fa-chevron-right text-slate-400 text-xs"></i>
        <span className="text-slate-600 font-medium">{rota.rotuloBreadcrumb}</span>
      </div>
    </nav>
  );
}
