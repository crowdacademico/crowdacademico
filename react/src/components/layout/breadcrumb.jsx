import { Link, matchPath, useLocation } from 'react-router';
import { ROTAS, ROTAS_ADMIN } from '../../services/router/rotas.constants';

// Rótulos vêm de services/router/rotas.constants.js (ROTAS + ROTAS_ADMIN)
// - mesma fonte que App.jsx usa pras rotas e admin-menu.constants.js usa
// pro menu lateral, nunca uma lista própria separada.
const TODAS_AS_ROTAS = [...ROTAS, ...ROTAS_ADMIN];

// Aparece embaixo do cabeçalho em toda página cujo rotuloBreadcrumb não
// seja null - só um jeito rápido de voltar. A aba padrão do admin
// (/admin/usuarios) tem rotuloBreadcrumb: null de propósito: mostrar
// "Início > Usuários" ali seria redundante com o próprio link "Início".
//
// Cadeia de ancestrais (10-08-2026, achado do Lucas: "Início > Alterar
// Usuário" devia ser "Início > Usuários > Alterar Usuário") - cada rota
// de detalhe (Alterar/Consultar/Excluir/Criar, ver rotas.constants.js)
// aponta pro `caminho` absoluto da própria listagem via `paiCaminho`; sobe
// essa cadeia até não ter mais pai (a maioria das rotas, sem aninhamento,
// já para na 1ª volta - nenhuma mudança de comportamento pra elas).
export function Breadcrumb() {
  const location = useLocation();

  // matchPath (não comparação exata de string) porque agora existem rotas
  // com parâmetro (ex.: /admin/usuarios/:id/alterar) - .criar-usuario.jsx
  // etc. seriam a única entrada nunca encontrada se comparássemos o
  // pathname literal contra ":id" ao invés do número de verdade da URL.
  const rota = TODAS_AS_ROTAS.find((r) => matchPath(r.caminho, location.pathname));
  if (!rota?.rotuloBreadcrumb) {
    return null;
  }

  const cadeia = [rota];
  let atual = rota;
  while (atual.paiCaminho) {
    const pai = TODAS_AS_ROTAS.find((r) => r.caminho === atual.paiCaminho);
    if (!pai) {
      break;
    }
    cadeia.unshift(pai);
    atual = pai;
  }
  const ultimoIndice = cadeia.length - 1;

  return (
    // sticky top-16 (pedido do Lucas, 02-08-2026: "queria que ele
    // acompanhasse o cabeçalho, conforme a gente vai rolando pra baixo") -
    // 16 = 4rem = a altura do <Header> (h-16), que também é sticky top-0;
    // z-40 (menor que o z-50 do Header) garante que o cabeçalho sempre fica
    // por cima quando os dois grudam juntos no topo.
    <nav className="fundo-sutil border-b borda-padrao sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-2 text-sm flex-wrap">
        <Link to="/" className="text-primary font-bold hover:underline">
          Início
        </Link>
        {cadeia.map((r, indice) => (
          <span key={r.caminho} className="flex items-center gap-2">
            <i className="fa-solid fa-chevron-right texto-fraco text-xs"></i>
            {/* Ancestral (Usuários, Configurações...) é sempre a própria
                listagem, sem parâmetro - pode virar link de verdade. Só o
                ÚLTIMO nível (a página atual) fica como texto simples. */}
            {indice === ultimoIndice ? (
              <span className="texto-padrao font-medium">{r.rotuloBreadcrumb}</span>
            ) : (
              <Link to={r.caminho} className="text-primary font-bold hover:underline">
                {r.rotuloBreadcrumb}
              </Link>
            )}
          </span>
        ))}
      </div>
    </nav>
  );
}
