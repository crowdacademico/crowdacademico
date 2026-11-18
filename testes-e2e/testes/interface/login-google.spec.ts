import { expect, test } from '@playwright/test';
import { URL_SITE_COM_GOOGLE } from '../../playwright.config';
import { ipNovo, URL_API } from '../apoio';

// Login com Google (18-11-2026). O login de verdade (a janela do Google) não dá para automatizar; aqui fica o que é do
// sistema: o botão só existe com VITE_GOOGLE_CLIENT_ID (nada de botão falso), no login e no cadastro, e a API recusa um
// token que não veio do Google. As regras da conta (vincular, criar, recusar) são da suíte PGlite 70 e dos testes do
// Nest (auth.service.google.spec.ts).

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': ipNovo() });
  // O script do Google nunca é baixado no teste: a tela só precisa reservar o lugar do botão.
  await page.route('https://accounts.google.com/**', (rota) => rota.abort());
});

for (const caminho of ['/login', '/cadastro']) {
  test(`sem VITE_GOOGLE_CLIENT_ID, ${caminho} não mostra o botão do Google`, async ({ page }) => {
    await page.goto(caminho);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByTestId('botao-google')).toHaveCount(0);
    await expect(page.getByText(/Ou (acesse|crie a conta) com/)).toHaveCount(0);
  });

  test(`com VITE_GOOGLE_CLIENT_ID, ${caminho} mostra o botão do Google`, async ({ page }) => {
    await page.goto(`${URL_SITE_COM_GOOGLE}${caminho}`);
    await expect(page.getByTestId('botao-google')).toHaveCount(1);
    await expect(page.getByText(/Ou (acesse|crie a conta) com/)).toBeVisible();
  });
}

test('a API recusa um token que não veio do Google', async ({ request }) => {
  const r = await request.post(`${URL_API}/auth/google`, {
    data: { credential: 'isto-nao-e-um-token-do-google' },
    headers: { 'X-Forwarded-For': ipNovo() },
  });
  expect(r.status()).toBe(401);
  expect(((await r.json()) as { message: string }).message).toContain('Google');
});
