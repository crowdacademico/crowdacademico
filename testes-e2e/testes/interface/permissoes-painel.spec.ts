import { expect, test, type Page } from '@playwright/test';
import { entrarPelaTela, ipNovo, SENHA, URL_API } from '../apoio';

// Menu do painel por permissão (17-11-2026): cada papel vê só as telas que as permissões dele liberam; a tela proibida,
// aberta pelo endereço, mostra o aviso "sem acesso" em vez de vir vazia; e o link "Painel Admin" do menu da conta leva
// à primeira tela que o papel consegue usar. O banco continua recusando os dados de qualquer jeito (suíte PGlite).

const CONTAS = {
  admin: 'admin@crowdacademico.com.br',
  curador: 'curador@crowdacademico.com.br', // aprova e rejeita campanhas, catálogos, relatório, pesquisadores e contas (só leitura)
  moderador: 'moderador@crowdacademico.com.br', // denúncias, comentários, atualizações, encerrar por moderação
  suporte: 'suporte.sistema@crowdacademico.com.br', // atendimento: ver usuários, desbloquear, reenviar verificação
  revisor: 'revisor@crowdacademico.com.br', // relatório, auditoria financeira, log
};

// O que cada papel PRECISA ver e o que NÃO pode aparecer (rótulos do menu lateral).
const ESPERADO: Record<keyof typeof CONTAS, { ve: string[]; naoVe: string[]; proibida: string }> = {
  admin: { ve: ['Dashboard', 'Usuários', 'Parâmetros do Sistema', 'Aprovar Campanhas', 'Denúncias', 'Auditoria Financeira'], naoVe: [], proibida: '' },
  curador: { ve: ['Dashboard', 'Aprovar Campanhas', 'Campanhas', 'Áreas do Conhecimento', 'Pesquisadores', 'Usuários'], naoVe: ['Notificações', 'Parâmetros do Sistema', 'Denúncias', 'Auditoria Financeira', 'Papéis & Permissões'], proibida: '/admin/parametros-sistema' },
  moderador: { ve: ['Denúncias', 'Atualizações', 'Campanhas'], naoVe: ['Dashboard', 'Aprovar Campanhas', 'Usuários', 'Parâmetros do Sistema', 'Repasses'], proibida: '/admin/usuarios' },
  suporte: { ve: ['Usuários'], naoVe: ['Dashboard', 'Aprovar Campanhas', 'Denúncias', 'Parâmetros do Sistema', 'Contribuições'], proibida: '/admin/denuncias' },
  revisor: { ve: ['Dashboard', 'Auditoria Financeira', 'Campanhas'], naoVe: ['Aprovar Campanhas', 'Denúncias', 'Usuários', 'Parâmetros do Sistema'], proibida: '/admin/aprovar-campanhas' },
};

const menu = (page: Page) => page.locator('.admin-sidebar');
const itemDoMenu = (page: Page, rotulo: string) => menu(page).locator('a.admin-sidebar__item', { hasText: new RegExp(`^\\s*${rotulo.replace(/[&]/g, '\\$&')}\\s*$`) });

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': ipNovo() });
});

test('o login devolve as permissões da conta (e a conta comum não tem nenhuma de gestão)', async ({ request }) => {
  const entrar = async (email: string) => {
    const r = await request.post(`${URL_API}/auth/login`, { data: { email, senha: SENHA }, headers: { 'X-Forwarded-For': ipNovo() } });
    expect(r.status()).toBe(201);
    return ((await r.json()) as { permissoes: string[] }).permissoes;
  };
  const curador = await entrar(CONTAS.curador);
  expect(curador).toContain('campanha_aprovar');
  expect(curador).not.toContain('configuracao_gerenciar');
  const comum = await entrar('fernanda.souza@gmail.com');
  expect(comum.filter((p) => ['campanha_aprovar', 'denuncia_responder', 'configuracao_gerenciar'].includes(p))).toEqual([]);
});

for (const papel of Object.keys(CONTAS) as (keyof typeof CONTAS)[]) {
  test(`menu do painel do ${papel}: só as telas que ele consegue usar`, async ({ page }) => {
    const esperado = ESPERADO[papel];
    await entrarPelaTela(page, CONTAS[papel]);

    // O link "Painel Admin" do menu da conta leva à primeira tela que o papel consegue usar.
    await page.getByRole('button', { name: /menu da conta|conta/i }).first().click();
    await page.getByRole('link', { name: 'Painel Admin' }).click();
    await expect(page).toHaveURL(/\/admin\//);
    await expect(page.getByText('Você não tem acesso a esta tela.')).toHaveCount(0);

    for (const rotulo of esperado.ve) await expect(itemDoMenu(page, rotulo), `deveria ver "${rotulo}"`).toHaveCount(1);
    for (const rotulo of esperado.naoVe) await expect(itemDoMenu(page, rotulo), `não deveria ver "${rotulo}"`).toHaveCount(0);

    if (esperado.proibida) {
      await page.goto(esperado.proibida);
      await expect(page.getByText('Você não tem acesso a esta tela.')).toBeVisible();
      await page.getByRole('link', { name: 'Ir para o painel' }).click();
      await expect(page.getByText('Você não tem acesso a esta tela.')).toHaveCount(0);
    }
  });
}

test('a busca do painel (Ctrl+K) também esconde as telas que o papel não usa', async ({ page }) => {
  await entrarPelaTela(page, CONTAS.moderador);
  await page.goto('/admin/denuncias');
  await menu(page).getByRole('button', { name: /Buscar/ }).click();
  const busca = page.getByRole('dialog', { name: 'Busca global' });
  await expect(busca).toBeVisible();
  await expect(busca.getByText('Denúncias', { exact: true }).first()).toBeVisible();
  await expect(busca.getByText('Parâmetros do Sistema', { exact: true })).toHaveCount(0);
});

test('o curador abre Pesquisadores com os nomes de verdade e consulta a ficha (17-11-2026)', async ({ page }) => {
  await entrarPelaTela(page, CONTAS.curador);
  await page.goto('/admin/pesquisadores');
  await expect(page.getByText('Você não tem acesso a esta tela.')).toHaveCount(0);
  const linha = page.locator('tr', { hasText: 'Ana Beatriz Santos' });
  await expect(linha).toHaveCount(1);
  await linha.locator('[aria-label="Consultar"]').click();
  await expect(page.getByRole('dialog')).toContainText('Ana Beatriz Santos');
  await expect(page.getByRole('dialog').getByText(/sem permissão/i)).toHaveCount(0);
  // CPF mascarado no padrão do mercado: o Curador confere a pessoa sem ver o número inteiro.
  await expect(page.getByRole('dialog')).toContainText(/\*\*\*\.\d{3}\.\d{3}-\*\*/);
});

test('o CPF: o admin vê inteiro, e o visitante não recebe nada pela API pública', async ({ page, request }) => {
  const publico = await request.get(`${URL_API}/perfil-pesquisador/8`, { headers: { 'X-Forwarded-For': ipNovo() } });
  expect(publico.ok()).toBe(true);
  expect(((await publico.json()) as { cpf: string | null }).cpf).toBeNull();

  await entrarPelaTela(page, CONTAS.admin);
  await page.goto('/admin/pesquisadores');
  await page.locator('tr', { hasText: 'Ana Beatriz Santos' }).locator('[aria-label="Consultar"]').click();
  await expect(page.getByRole('dialog')).toContainText(/\d{3}\.\d{3}\.\d{3}-\d{2}/);
});
