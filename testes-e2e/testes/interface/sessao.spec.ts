import { expect, test, type Page } from '@playwright/test';
import { CONTAS, ipNovo, SENHA, sql, URL_API } from '../apoio';

// Quanto tempo a sessão dura (18-11-2026):
//   - "Manter conectado neste computador", marcada por padrão (21-11-2026): desmarcada, a chave de renovação vai para o
//     sessionStorage e some ao fechar o navegador; marcada, vai para o localStorage e sobrevive;
//   - conta do painel: a sessão vale no máximo sessao_painel_horas_validade (12) horas sem uso, mesmo marcada; a conta
//     comum segue o prazo comum (refresh_token_dias_validade, 30 dias).

const CHAVE = 'crowdacademico.refreshToken';

const horasDaUltimaSessao = async (email: string) =>
  Number(
    (
      await sql<{ horas: string }>(
        `select extract(epoch from (expira_em - criado_em)) / 3600 as horas from sessao
         where id_usuario = (select id_usuario from usuario where email = '${email}') order by id_sessao desc limit 1`,
      )
    )[0].horas,
  );

const entrar = async (page: Page, email: string, manter: boolean) => {
  await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': ipNovo() });
  await page.goto('/login');
  await page.getByLabel('Seu E-mail').fill(email);
  await page.locator('input[type="password"]').fill(SENHA);
  const caixa = page.getByLabel('Manter conectado neste computador');
  await expect(caixa).toBeChecked();
  if (!manter) await caixa.uncheck();
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
};

// O menu da conta existe também para quem não entrou: sem sessão, ele mostra o ícone de pessoa no lugar da inicial.
const semSessao = (page: Page) => expect(page.getByRole('button', { name: 'Menu da conta' }).locator('.fa-user')).toHaveCount(1);
const comSessao = async (page: Page) => {
  await expect(page.getByRole('button', { name: 'Menu da conta' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu da conta' }).locator('.fa-user')).toHaveCount(0);
};

const gavetas = (page: Page) =>
  page.evaluate((chave) => ({ local: localStorage.getItem(chave), sessao: sessionStorage.getItem(chave) }), CHAVE);

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

test('a caixa "Manter conectado" vem marcada; desmarcada, a sessão fica só nesta aba (sessionStorage)', async ({ page, context }) => {
  await entrar(page, CONTAS.fernanda, false);
  const g = await gavetas(page);
  expect(g.local).toBeNull();
  expect(g.sessao).not.toBeNull();

  // Uma aba nova do zero é como reabrir o navegador: não está logada.
  const outra = await context.newPage();
  await outra.goto('/');
  await semSessao(outra);
  expect((await gavetas(outra)).sessao).toBeNull();
});

test('marcada, a sessão sobrevive a reabrir o navegador (localStorage)', async ({ page, context }) => {
  await entrar(page, CONTAS.fernanda, true);
  const g = await gavetas(page);
  expect(g.local).not.toBeNull();
  expect(g.sessao).toBeNull();

  const outra = await context.newPage();
  await outra.goto('/');
  await comSessao(outra);
});

test('o Sair apaga a chave das duas gavetas', async ({ page }) => {
  await entrar(page, CONTAS.fernanda, true);
  await page.getByRole('button', { name: 'Menu da conta' }).click();
  await page.getByRole('button', { name: /^Sair/ }).click();
  await semSessao(page);
  expect(await gavetas(page)).toEqual({ local: null, sessao: null });
});

test('a conta do painel vale 12 horas sem uso, também depois de renovar; a conta comum, 30 dias', async ({ request }) => {
  const login = async (email: string) => {
    const r = await request.post(`${URL_API}/auth/login`, { data: { email, senha: SENHA }, headers: { 'X-Forwarded-For': ipNovo() } });
    expect(r.status()).toBe(201);
    return ((await r.json()) as { refreshToken: string }).refreshToken;
  };

  const tokenAdmin = await login(CONTAS.admin);
  expect(await horasDaUltimaSessao(CONTAS.admin)).toBeCloseTo(12, 1);

  const renovada = await request.post(`${URL_API}/auth/refresh`, { data: { refreshToken: tokenAdmin }, headers: { 'X-Forwarded-For': ipNovo() } });
  expect(renovada.status()).toBe(201);
  expect(await horasDaUltimaSessao(CONTAS.admin)).toBeCloseTo(12, 1);

  await login(CONTAS.fernanda);
  expect(await horasDaUltimaSessao(CONTAS.fernanda)).toBeCloseTo(30 * 24, 1);
});
