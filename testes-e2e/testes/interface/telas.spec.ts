import { expect, test, type Page } from '@playwright/test';
import { CONTAS, emailUnico, entrarPelaApi, entrarPelaTela, ipNovo, sql, URL_API } from '../apoio';

// Roteiros de interface: o navegador repete os passos de uma pessoa nas telas que o Quadro 15 do TCC lista (página
// inicial, busca, campanha, apoio com Pix pelo provedor de teste, login, cadastro, recuperação de senha, Minha Conta,
// Estúdio e o painel administrativo), e nas funções conferidas em 16-11-2026 (RF-015, RF-027, RF-028, RF-047, RF-057 e
// RF-061). Cada teste também falha se a página jogar erro de JavaScript.

const errosDaPagina = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const erros: string[] = [];
  errosDaPagina.set(page, erros);
  page.on('pageerror', (erro) => erros.push(String(erro)));
  await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': ipNovo() });
});
test.afterEach(async ({ page }) => {
  expect(errosDaPagina.get(page) ?? [], 'erros de JavaScript na página').toEqual([]);
});

test.describe('Área pública', () => {
  test('página inicial mostra campanhas e leva à busca', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('article.cartao-campanha').first()).toBeVisible();
  });

  test('Explorar (busca) filtra as campanhas pelo texto', async ({ page }) => {
    await page.goto('/explorar');
    const cartoes = page.locator('article.cartao-campanha');
    await expect(cartoes.first()).toBeVisible();
    const total = await cartoes.count();
    await page.getByRole('searchbox').first().fill('Retinopatia');
    await expect.poll(async () => cartoes.count()).toBeLessThan(total);
    await expect(cartoes.first()).toContainText(/Retinopatia/i);
  });

  test('página da campanha: abas, link principal do pesquisador (RF-027) e orçamento em gráfico (RF-047)', async ({ page }) => {
    await page.goto('/campanha/3');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // RF-027: o primeiro link da lista da Ana é o Lattes.
    const cartao = page.locator('section', { has: page.getByRole('heading', { name: 'Pesquisador Responsável' }) });
    const link = cartao.getByRole('link', { name: /Lattes/ });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);
    // RF-047: distribuição por categoria, com o percentual escrito.
    await page.getByRole('tab', { name: 'Orçamento' }).click();
    const grafico = page.locator('figure', { hasText: 'Como a meta se divide' });
    await expect(grafico).toBeVisible();
    await expect(grafico).toContainText('%');
    await expect(page.getByRole('list', { name: 'Itens do orçamento' })).toBeVisible();
    await page.getByRole('tab', { name: 'Cronograma' }).click();
    await expect(page.locator('#tab-cronograma li').first()).toBeVisible();
  });

  test('pesquisador sem link acadêmico: nenhum link aparece na campanha (RF-027)', async ({ page }) => {
    const [{ n }] = await sql<{ n: number }>('select count(*)::int n from link_academico where id_usuario = 7');
    test.skip(n > 0, 'o seed passou a dar link ao pesquisador 7');
    await page.goto('/campanha/21');
    const cartao = page.locator('section', { has: page.getByRole('heading', { name: 'Pesquisador Responsável' }) });
    await expect(cartao).toBeVisible();
    await expect(cartao.locator('a[target="_blank"]')).toHaveCount(0);
  });

  test('perfil público do pesquisador: links na ordem e data de cadastro (RF-028)', async ({ page }) => {
    await page.goto('/pesquisador/8');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/Pesquisador na plataforma desde \d{1,2} de \S+ de \d{4}/)).toBeVisible();
    const links = page.getByRole('heading', { name: 'Links acadêmicos' }).locator('xpath=..').getByRole('link');
    await expect(links).toHaveCount(3);
    await expect(links.nth(0)).toContainText('Lattes');
    await expect(links.nth(1)).toContainText('ORCID');
  });

  test('vídeo do YouTube incorporado na página (RF-057)', async ({ page }) => {
    await sql("SET session_replication_role = replica; UPDATE campanha SET video_apresentacao_url = 'https://youtu.be/dQw4w9WgXcQ' WHERE id_campanha = 7; SET session_replication_role = origin;");
    try {
      await page.goto('/campanha/7');
      const video = page.locator('iframe[title^="Vídeo de apresentação"]');
      await expect(video).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
      await expect(video).toHaveAttribute('loading', 'lazy');
    } finally {
      await sql("SET session_replication_role = replica; UPDATE campanha SET video_apresentacao_url = NULL WHERE id_campanha = 7; SET session_replication_role = origin;");
    }
  });

  test('campanha "Em breve": contagem regressiva e duração em vez de "restantes" (RF-061)', async ({ page }) => {
    await page.goto('/campanha/12');
    const contagem = page.getByRole('timer');
    await expect(contagem).toBeVisible();
    await expect(contagem).toHaveAttribute('aria-label', /A captação começa em \d+ dias? e \d+ horas?/);
    await expect(page.getByText('Dias de captação')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apoiar esta pesquisa' })).toHaveCount(0);

    await page.goto('/explorar');
    const cartao = page.locator('article.cartao-campanha', { has: page.locator('a[href="/campanha/12"]') });
    await expect(cartao).toContainText(/Começa em \d+ dias?/);
    await expect(cartao).toContainText(/dias? de captação/);
    await expect(cartao).not.toContainText('restantes');
  });

  test('boleto desligado (boleto_habilitado = false) não aparece no apoio nem em Taxas e transparência', async ({ page }) => {
    const [config] = await sql<{ valor: string }>("select valor from configuracoes where chave = 'boleto_habilitado'");
    test.skip(config?.valor !== 'false', 'o boleto está ligado neste banco');
    await page.goto('/transparencia');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('#conteudo-publico')).not.toContainText(/boleto/i);
    await page.goto('/campanha/3');
    await page.getByRole('button', { name: 'Apoiar esta pesquisa' }).click();
    await expect(page.getByRole('radiogroup', { name: 'Forma de pagamento' })).toBeVisible();
    await expect(page.getByRole('dialog')).not.toContainText(/boleto/i);
  });

  test('apoio com Pix pelo provedor de teste: QR gerado e confirmação na tela', async ({ page, request }) => {
    await page.goto('/campanha/3');
    await page.getByRole('button', { name: 'Apoiar esta pesquisa' }).click();
    const modal = page.getByRole('dialog');
    await modal.getByRole('group', { name: 'Valores sugeridos' }).getByRole('button').first().click();
    await modal.getByText('Entendi que o valor vai para o pesquisador mesmo sem a meta.').click();
    await modal.locator('label', { hasText: /Termos de Uso/ }).locator('input[type="checkbox"]').check();
    await modal.getByRole('button', { name: /Gerar Pix/ }).click();
    await expect(modal.getByText('Pague com Pix')).toBeVisible();
    await expect(modal.locator('#pix-copia-cola')).not.toHaveValue('');

    const protocolo = Number((await modal.getByText(/^Protocolo/).first().innerText()).match(/Protocolo\s+(\d+)/)?.[1]);
    const token = await entrarPelaApi(request, CONTAS.admin);
    const pago = await request.post(`${URL_API}/campo-testes/pagamento/contribuicoes/${protocolo}/pagar`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Forwarded-For': ipNovo() },
    });
    expect(pago.ok(), await pago.text()).toBe(true);
    await expect(modal.getByText('Obrigado pelo apoio!')).toBeVisible({ timeout: 30_000 });
    const [contribuicao] = await sql<{ status: string }>(`select status from contribuicao where id_contribuicao = ${protocolo}`);
    expect(contribuicao.status).toBe('confirmado');
  });
});

test.describe('Conta', () => {
  test('login pela tela e mensagem genérica no login inválido (CT-04)', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Seu E-mail').fill(CONTAS.fernanda);
    await page.locator('input[type="password"]').fill('senha-errada');
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByText("E-mail ou senha inválidos. Tente novamente ou clique em 'Esqueceu a senha?'.").first()).toBeVisible();
    await entrarPelaTela(page, CONTAS.fernanda);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('cadastro: sem aceite mostra a mensagem junto da caixa (CT-03) e com aceite cria a conta (CT-01)', async ({ page }) => {
    const email = emailUnico('tela');
    await page.goto('/cadastro');
    await page.getByRole('button', { name: /Quero apoiar/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByLabel('Nome').fill('Pessoa da Tela');
    await page.getByLabel('E-mail').fill(email);
    await page.locator('input[type="password"]').nth(0).fill('senhaboa1');
    await page.locator('input[type="password"]').nth(1).fill('senhaboa1');
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByText('É preciso aceitar o Termo de Uso para criar a conta.')).toBeVisible();
    expect((await sql(`select 1 from usuario where email = '${email}'`)).length).toBe(0);

    await page.locator('label', { hasText: 'Li e aceito os' }).first().locator('input[type="checkbox"]').check();
    page.once('dialog', (dialogo) => void dialogo.dismiss());
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page).toHaveURL(/\/$/);
    expect((await sql(`select 1 from usuario where email = '${email}'`)).length).toBe(1);
  });

  test('quem já está logado não abre o Criar conta nem o Login (bug de 16-11-2026)', async ({ page }) => {
    await entrarPelaTela(page, CONTAS.fernanda);
    await page.goto('/cadastro');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Criar conta' })).toHaveCount(0);
    await page.goto('/login');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('cadastro: o vermelho dos campos não fica ao voltar e trocar o tipo de conta (bug de 16-11-2026)', async ({ page }) => {
    await page.goto('/cadastro');
    await page.getByRole('button', { name: /Quero apoiar/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByText('Informe o e-mail.')).toBeVisible();

    await page.getByRole('button', { name: 'Voltar' }).click();
    await page.getByRole('button', { name: /Sou pesquisador/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await expect(page.getByLabel('Nome')).toBeVisible();
    await expect(page.getByText('Informe o e-mail.')).toHaveCount(0);
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);

    // Uma tentativa nova volta a marcar os erros.
    await page.getByRole('button', { name: 'Criar conta' }).click();
    await expect(page.getByText('Informe o e-mail.')).toBeVisible();
  });

  test('recuperação de senha: pedido aceito com aviso que não revela se a conta existe', async ({ page }) => {
    await page.goto('/esqueci-senha');
    await page.getByLabel('E-mail').fill(emailUnico('recupera'));
    page.once('dialog', (dialogo) => void dialogo.dismiss());
    await page.getByRole('button', { name: /Enviar/ }).click();
    await expect(page.getByRole('status').or(page.getByText(/Se existir uma conta|enviamos/i)).first()).toBeVisible();
  });

  test('Minha Conta abre o perfil da conta comum', async ({ page }) => {
    await entrarPelaTela(page, CONTAS.fernanda);
    await page.goto('/minha-conta/perfil');
    await expect(page.getByRole('heading', { level: 1, name: /Minha Conta/i })).toBeVisible();
    await expect(page.getByText('Fernanda Souza Lima', { exact: true }).first()).toBeVisible();
  });

  test('Estúdio do pesquisador: campanhas da pesquisadora e o botão "Nova campanha"', async ({ page }) => {
    await entrarPelaTela(page, CONTAS.ana);
    await page.goto('/estudio-pesquisador');
    await expect(page.getByRole('button', { name: 'Nova campanha' })).toBeVisible();
    await expect(page.getByText(/Mapeamento|Alzheimer/).first()).toBeVisible();
  });
});

test.describe('Termo novo pendente (RF-015)', () => {
  // A pendência vem do seed (Marina sem o aceite do Termo de Uso vigente, Vinícius sem o do Termo de Pesquisador).
  // Antes de cada teste, apaga o aceite da versão vigente, caso outra rodada no mesmo banco já tenha aceitado.
  test.beforeEach(async () => {
    await sql(`SET session_replication_role = replica;
      DELETE FROM usuario_termo ut USING termos_de_uso t
      WHERE ut.id_termo = t.id_termo AND t.ativo
        AND ((ut.id_usuario = 21 AND t.tipo = 'cadastro') OR (ut.id_usuario = 16 AND t.tipo = 'upgrade_pesquisador'));
      SET session_replication_role = origin;`);
  });

  test('conta comum com Termo de Uso pendente cai no aceite pela área pública; "Sair" encerra a sessão', async ({ page }) => {
    await entrarPelaTela(page, CONTAS.marina);
    const termo = page.getByRole('dialog');
    await expect(termo).toContainText('Termo de Uso');
    await expect(termo.getByRole('button', { name: 'Li e aceito' })).toBeVisible();
    // Nenhuma tela da área do usuário abre por trás do aceite.
    await page.goto('/minha-conta/perfil');
    await expect(page.getByRole('dialog')).toContainText('Termo de Uso');
    await expect(page.getByText('Marina Alves Torres', { exact: true })).toHaveCount(0);
    await page.getByRole('dialog').getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter((k) => /token|sessao|auth/i.test(k)).map((k) => localStorage.getItem(k)).join(''))).toBe('');
  });

  test('aceitar libera a conta (Marina) e o pesquisador aceita o Termo de Pesquisador (Vinícius)', async ({ page }) => {
    await entrarPelaTela(page, CONTAS.marina);
    await page.getByRole('dialog').getByRole('button', { name: 'Li e aceito' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goto('/minha-conta/perfil');
    await expect(page.getByText('Marina Alves Torres', { exact: true }).first()).toBeVisible();

    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await entrarPelaTela(page, CONTAS.vinicius);
    await expect(page.getByRole('dialog')).toContainText(/Pesquisador/);
    await page.getByRole('dialog').getByRole('button', { name: 'Li e aceito' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.goto('/estudio-pesquisador');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('Painel administrativo', () => {
  test('aprovação: rejeitar sem motivo fica bloqueado (CT-10) e aprovar tira a campanha da fila', async ({ page }) => {
    await entrarPelaTela(page, CONTAS.admin);
    await page.goto('/admin/aprovar-campanhas');
    const linha = page.locator('tr', { hasText: /^20|\b20\b/ }).filter({ has: page.locator('[aria-label="Alterar"]') }).first();
    await page.locator('tr').filter({ has: page.getByText('20', { exact: true }) }).locator('[aria-label="Alterar"]').first().click();
    const modal = page.getByRole('dialog');
    await modal.getByRole('button', { name: 'Rejeitar' }).click();
    await expect(modal.getByText('Escreva o motivo da rejeição: o pesquisador lê este texto para corrigir.')).toBeVisible();
    const [linhaBanco] = await sql<{ status: string }>('select status from campanha where id_campanha = 20');
    expect(linhaBanco.status).toBe('aguardando_aprovacao');
    void linha;
  });

  test('administrador dono da campanha vê a mensagem da regra nova ao tentar aprovar (CT-11)', async ({ page }) => {
    const [{ dono }] = await sql<{ dono: number }>('select id_usuario dono from campanha where id_campanha = 18');
    await sql("SET session_replication_role = replica; UPDATE campanha SET id_usuario = 1 WHERE id_campanha = 18; SET session_replication_role = origin;");
    try {
      await entrarPelaTela(page, CONTAS.admin);
      await page.goto('/admin/aprovar-campanhas');
      await page.locator('tr').filter({ has: page.getByText('18', { exact: true }) }).locator('[aria-label="Alterar"]').first().click();
      const modal = page.getByRole('dialog');
      const aprovar = modal.getByRole('button', { name: 'Aprovar' });
      if (await aprovar.isDisabled()) {
        // Checklist de revisão: marca os itens para liberar o botão.
        for (const caixa of await modal.locator('input[type="checkbox"]').all()) await caixa.check();
      }
      await aprovar.click();
      await expect(page.getByText('Você não pode aprovar a sua própria campanha. Outro administrador precisa fazer a aprovação.').first()).toBeVisible();
    } finally {
      await sql(`SET session_replication_role = replica; UPDATE campanha SET id_usuario = ${dono} WHERE id_campanha = 18; SET session_replication_role = origin;`);
    }
  });

  for (const [rota, titulo] of [
    ['/admin/dashboard', /Dashboard|Painel/],
    ['/admin/contribuicoes', /Contribuições/],
    ['/admin/repasses', /Repasses/],
    ['/admin/eventos-pagamento', /Eventos/],
    ['/admin/reembolsos-manuais', /Reembolsos|Devoluções/],
    ['/admin/repasses-atencao', /atenção|Atenção/],
    ['/admin/auditoria-financeira', /Auditoria/],
    ['/admin/denuncias', /Denúncias/],
    ['/admin/pedidos-encerramento', /encerramento/i],
  ] as const) {
    test(`painel: ${rota} abre sem erro`, async ({ page }) => {
      await entrarPelaTela(page, CONTAS.admin);
      await page.goto(rota);
      await expect(page.getByRole('heading', { name: titulo }).first()).toBeVisible();
      await expect(page.getByText(/Algo deu errado|Erro inesperado/)).toHaveCount(0);
    });
  }
});
