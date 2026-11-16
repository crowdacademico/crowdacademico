import { expect, test } from '@playwright/test';
import { anexo, CONTAS, entrarPelaTela, graves, ipNovo, larguraExcedente, rodarAxe } from '../apoio';

// axe-core em todas as páginas públicas e nas principais da área restrita, no tema claro e no escuro, no computador
// (1440 px) e no celular (390 px). Falha com qualquer violação "critical" ou "serious"; as "moderate" e "minor" ficam
// anotadas no resultado (o relatório lista todas). No celular, a página também não pode ter rolagem lateral.

type Conta = keyof typeof CONTAS | null;
const PAGINAS: { nome: string; rota: string; conta: Conta }[] = [
  { nome: 'Página inicial', rota: '/', conta: null },
  { nome: 'Explorar', rota: '/explorar', conta: null },
  { nome: 'Campanha', rota: '/campanha/3', conta: null },
  { nome: 'Campanha "Em breve"', rota: '/campanha/12', conta: null },
  { nome: 'Perfil do pesquisador', rota: '/pesquisador/8', conta: null },
  { nome: 'Como funciona', rota: '/como-funciona', conta: null },
  { nome: 'Taxas e transparência', rota: '/transparencia', conta: null },
  { nome: 'Perguntas frequentes', rota: '/perguntas-frequentes', conta: null },
  { nome: 'Sobre', rota: '/sobre', conta: null },
  { nome: 'Termo de Uso', rota: '/termos', conta: null },
  { nome: 'Login', rota: '/login', conta: null },
  { nome: 'Cadastro', rota: '/cadastro', conta: null },
  { nome: 'Recuperação de senha', rota: '/esqueci-senha', conta: null },
  { nome: 'Minha Conta', rota: '/minha-conta/perfil', conta: 'fernanda' },
  { nome: 'Minha Conta: Financeiro', rota: '/minha-conta/financeiro', conta: 'fernanda' },
  { nome: 'Estúdio do pesquisador', rota: '/estudio-pesquisador', conta: 'ana' },
  { nome: 'Painel: Dashboard', rota: '/admin/dashboard', conta: 'admin' },
  { nome: 'Painel: Aprovar campanhas', rota: '/admin/aprovar-campanhas', conta: 'admin' },
  { nome: 'Painel: Campanhas', rota: '/admin/campanhas', conta: 'admin' },
  { nome: 'Painel: Usuários', rota: '/admin/usuarios', conta: 'admin' },
  { nome: 'Painel: Contribuições', rota: '/admin/contribuicoes', conta: 'admin' },
  { nome: 'Painel: Repasses', rota: '/admin/repasses', conta: 'admin' },
];

const COMBINACOES = [
  { tema: 'claro', largura: 1440 },
  { tema: 'escuro', largura: 1440 },
  { tema: 'claro', largura: 390 },
  { tema: 'escuro', largura: 390 },
] as const;

for (const pagina of PAGINAS) {
  test.describe(pagina.nome, () => {
    for (const { tema, largura } of COMBINACOES) {
      test(`${tema}, ${largura}px`, async ({ page }) => {
        await page.setViewportSize({ width: largura, height: largura === 390 ? 844 : 900 });
        await page.addInitScript((valor) => localStorage.setItem('crowdacademico.tema', valor), tema);
        await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': ipNovo() });
        if (pagina.conta) await entrarPelaTela(page, CONTAS[pagina.conta]);
        await page.goto(pagina.rota);
        await page.waitForLoadState('networkidle');
        await expect(page.locator('html')).toHaveAttribute('data-tema-efetivo', tema);

        const violacoes = await rodarAxe(page);
        const excedente = largura === 390 ? await larguraExcedente(page) : 0;
        await test.info().attach(
          'axe',
          anexo('axe', {
            pagina: pagina.nome,
            rota: pagina.rota,
            tema,
            largura,
            rolagemLateralPx: excedente,
            violacoes: violacoes.map((v) => ({ id: v.id, impacto: v.impact, ocorrencias: v.nodes.length, ajuda: v.help, exemplo: v.nodes[0]?.target.join(' ') })),
          }),
        );

        expect(graves(violacoes).map((v) => `${v.impact}: ${v.id} (${v.nodes.length}x) ${v.nodes[0]?.target.join(' ')}`), 'violações critical/serious').toEqual([]);
        if (largura === 390) expect(excedente, 'rolagem lateral no celular (px)').toBeLessThanOrEqual(0);
      });
    }
  });
}
