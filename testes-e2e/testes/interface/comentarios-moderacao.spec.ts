import { expect, test } from '@playwright/test';
import { entrarPelaTela, ipNovo } from '../apoio';

// Tela Comentários da moderação (18-11-2026): só para o caso excepcional de um comentário perigoso. O moderador oculta,
// o comentário fica "Oculto" e só a moderação o mostra de novo. O teste desfaz o que fez, para não mudar o banco.

const COMENTARIO = 'Triagem por celular pode chegar onde não há oftalmologista';

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': ipNovo() });
});

test('o moderador oculta um comentário e mostra de novo', async ({ page }) => {
  await entrarPelaTela(page, 'moderador@crowdacademico.com.br');
  await page.goto('/admin/comentarios');
  await expect(page.getByText('Você não tem acesso a esta tela.')).toHaveCount(0);
  await page.getByRole('searchbox').first().fill('oftalmologista');

  const linha = page.locator('tr', { hasText: COMENTARIO });
  await expect(linha).toHaveCount(1);
  await expect(linha).not.toContainText('Oculto');

  await linha.getByRole('button', { name: 'Ocultar', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Ocultar' }).click();
  await expect(page.getByText('Comentário ocultado.')).toBeVisible();
  await expect(linha).toContainText('Oculto');

  await linha.getByRole('button', { name: 'Mostrar de novo', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mostrar de novo' }).click();
  await expect(page.getByText('Comentário visível de novo.')).toBeVisible();
  await expect(linha).not.toContainText('Oculto');
});

test('quem não modera não vê a tela Comentários', async ({ page }) => {
  await entrarPelaTela(page, 'curador@crowdacademico.com.br');
  await page.goto('/admin/comentarios');
  await expect(page.getByText('Você não tem acesso a esta tela.')).toBeVisible();
});
