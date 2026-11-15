import { useEffect } from 'react';
import { matchPath, useLocation } from 'react-router';
import { ROTAS, ROTAS_ADMIN, ROTAS_CONTA } from '../../services/router/rotas.constants';
import { definirTituloDaPagina } from './definir-titulo-pagina';

// Título da aba do navegador por página (WCAG 2.4.2, "página com título", nível A). Antes toda página era só
// "CrowdAcadêmico": quem usa leitor de tela ouvia o mesmo nome ao trocar de página, e o histórico e as abas abertas
// ficavam indistinguíveis (16-11-2026). O rótulo vem da MESMA lista de rotas do breadcrumb e do menu (rotas.constants);
// uma página com nome próprio (a campanha) troca pelo dela com `definirTituloDaPagina`.
export function TituloDaPagina() {
  const { pathname } = useLocation();
  useEffect(() => {
    const rota = [...ROTAS, ...ROTAS_CONTA, ...ROTAS_ADMIN].find((item) => matchPath(item.caminho, pathname));
    const rotulo = rota?.rotuloMenu ?? rota?.rotuloBreadcrumb ?? null;
    definirTituloDaPagina(rotulo);
  }, [pathname]);
  return null;
}

