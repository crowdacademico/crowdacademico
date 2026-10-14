import type { Rota } from '../services/router/rotas.constants';
import { MinhasCampanhas } from '../views/12-campanha/minhas-campanhas';
import { BancadaPesquisador } from './paginas/bancada-pesquisador';
import { BancadaCampanha } from './paginas/bancada-campanha';
import { CampanhasSeguidas } from './paginas/campanhas-seguidas';
import { GuiaEstilo } from './paginas/guia-estilo/1-guia-estilo';

// Única porta do Campo de Testes para o sistema: services/router/campo-testes-opcional.ts carrega este arquivo
// só em desenvolvimento e só se ele existir. Apagar a pasta src/campo-testes/ não quebra o build.
export { CampoTestesProvider } from './servicos/context/campo-testes-provider';

export const ROTAS_CAMPO_TESTES: Rota[] = [
  {
    caminho: '/admin/campo-testes/pesquisador',
    caminhoRelativo: 'campo-testes/pesquisador',
    elemento: BancadaPesquisador,
    rotuloMenu: 'T1 - Bancada do Pesquisador',
    rotuloBreadcrumb: 'T1 - Bancada do Pesquisador',
    grupoMenu: 'CAMPO_TESTES',
    icone: 'fa-flask',
  },
  {
    caminho: '/admin/campo-testes/campanha',
    caminhoRelativo: 'campo-testes/campanha',
    elemento: BancadaCampanha,
    rotuloMenu: 'T2 - Bancada da Campanha',
    rotuloBreadcrumb: 'T2 - Bancada da Campanha',
    grupoMenu: 'CAMPO_TESTES',
    icone: 'fa-bullhorn',
  },
  {
    // Minhas Campanhas: o pesquisador não usa a área restrita (ele terá a área dele na parte pública);
    // aqui fica só para testar o fluxo dele (criar, completar, enviar, corrigir).
    caminho: '/admin/campo-testes/minhas-campanhas',
    caminhoRelativo: 'campo-testes/minhas-campanhas',
    elemento: MinhasCampanhas,
    rotuloMenu: 'T3 - Minhas Campanhas',
    rotuloBreadcrumb: 'T3 - Minhas Campanhas',
    grupoMenu: 'CAMPO_TESTES',
    icone: 'fa-folder-open',
  },
  {
    // Campanhas que a conta logada segue (seguir, deixar de seguir, consultar as atualizações).
    caminho: '/admin/campo-testes/campanhas-seguidas',
    caminhoRelativo: 'campo-testes/campanhas-seguidas',
    elemento: CampanhasSeguidas,
    rotuloMenu: 'T4 - Campanhas Seguidas',
    rotuloBreadcrumb: 'T4 - Campanhas Seguidas',
    grupoMenu: 'CAMPO_TESTES',
    icone: 'fa-bell',
  },
  {
    // Guia de Estilo: cores nos dois temas, tipografia e componentes reais.
    caminho: '/admin/campo-testes/guia-estilo',
    caminhoRelativo: 'campo-testes/guia-estilo',
    elemento: GuiaEstilo,
    rotuloMenu: 'Guia de Estilo',
    rotuloBreadcrumb: 'Guia de Estilo',
    grupoMenu: 'CAMPO_TESTES',
    icone: 'fa-palette',
  },
];
