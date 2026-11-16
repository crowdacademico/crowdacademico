import { expect, test } from '@playwright/test';
import { CONTAS, entrarPelaTela, graves, ipNovo, larguraExcedente, rodarAxe } from '../apoio';

// CT-15 do TCC: cadastro, login, recuperação de senha, o painel, a página inicial e a página de campanha num celular de
// 390 pixels. Cada função disponível e legível (o botão principal da tela à vista e clicável), sem rolagem lateral e
// sem falha grave (critical ou serious) apontada pelo axe-core.

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

const CASOS: { nome: string; rota: string; conta?: keyof typeof CONTAS; funcao: (p: import('@playwright/test').Page) => import('@playwright/test').Locator }[] = [
  { nome: 'cadastro', rota: '/cadastro', funcao: (p) => p.getByRole('button', { name: 'Continuar' }) },
  { nome: 'login', rota: '/login', funcao: (p) => p.getByRole('button', { name: 'Entrar', exact: true }) },
  { nome: 'recuperação de senha', rota: '/esqueci-senha', funcao: (p) => p.getByRole('button', { name: /Enviar/ }) },
  { nome: 'página inicial', rota: '/', funcao: (p) => p.locator('article.cartao-campanha').first() },
  { nome: 'página de campanha', rota: '/campanha/3', funcao: (p) => p.getByRole('button', { name: 'Apoiar esta pesquisa' }) },
  { nome: 'painel: dashboard', rota: '/admin/dashboard', conta: 'admin', funcao: (p) => p.getByRole('button', { name: 'Menu', exact: true }) },
  { nome: 'painel: tabela de campanhas', rota: '/admin/campanhas', conta: 'admin', funcao: (p) => p.getByRole('button', { name: /Consultar/ }).first() },
  { nome: 'painel: aprovação', rota: '/admin/aprovar-campanhas', conta: 'admin', funcao: (p) => p.getByRole('button', { name: /Alterar|Revisar/ }).first() },
];

for (const caso of CASOS) {
  test(`CT-15 ${caso.nome} em 390 px`, async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': ipNovo() });
    if (caso.conta) await entrarPelaTela(page, CONTAS[caso.conta]);
    await page.goto(caso.rota);
    await page.waitForLoadState('networkidle');

    const funcao = caso.funcao(page);
    await expect(funcao, 'função principal da tela à vista').toBeVisible();
    await funcao.scrollIntoViewIfNeeded();
    const caixa = await funcao.boundingBox();
    expect(caixa, 'função principal dentro da largura da tela').not.toBeNull();
    expect((caixa?.x ?? 0) + (caixa?.width ?? 0)).toBeLessThanOrEqual(390);

    expect(await larguraExcedente(page), 'rolagem lateral (px)').toBeLessThanOrEqual(0);
    expect(graves(await rodarAxe(page)).map((v) => `${v.impact}: ${v.id} ${v.nodes[0]?.target.join(' ')}`)).toEqual([]);
  });
}
