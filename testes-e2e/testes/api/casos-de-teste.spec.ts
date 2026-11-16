import { expect, test } from '@playwright/test';
import { comToken, CONTAS, emailUnico, entrarPelaApi, ipNovo, SENHA, sql, URL_API } from '../apoio';

// Roteiros de integração da API para os casos do Quadro 17 do TCC que antes só eram conferidos à mão (CT-01 a CT-06,
// CT-08, CT-09, CT-10, CT-11 e CT-13). Chamam o Nest de verdade, ligado ao banco local com o seed e aos provedores de
// pagamento e de e-mail de teste, e conferem a MENSAGEM EXATA que o TCC cita. Os demais casos (CT-07, CT-12, CT-14,
// CT-17, CT-18 e CT-19) são regras do banco e estão na suíte PGlite (informacoes/testes-banco).

const mensagem = async (resposta: { json: () => Promise<unknown> }) => {
  const corpo = (await resposta.json()) as { message?: string | string[] };
  return Array.isArray(corpo.message) ? corpo.message.join(' | ') : (corpo.message ?? '');
};

const cadastrar = (request: import('@playwright/test').APIRequestContext, dados: Record<string, unknown>) =>
  request.post(`${URL_API}/auth/cadastro`, { data: dados, headers: { 'X-Forwarded-For': ipNovo() } });

test.describe('Conta e acesso', () => {
  test('CT-01 cadastro válido: conta não verificada, sessão iniciada e e-mail de confirmação na fila', async ({ request }) => {
    const email = emailUnico('ct01');
    const resposta = await cadastrar(request, { nome: 'Pessoa de Teste', email, senha: 'senhaboa1', aceiteTermos: true });
    expect(resposta.status()).toBe(201);
    const corpo = (await resposta.json()) as { accessToken?: string };
    expect(corpo.accessToken, 'sessão iniciada').toBeTruthy();

    const [conta] = await sql<{ id_usuario: number; email_verificado: boolean }>(
      `select id_usuario, email_verificado from usuario where email = '${email}'`,
    );
    expect(conta.email_verificado).toBe(false);
    const [token] = await sql<{ n: number; prazo: boolean; unico: boolean }>(
      `select count(*)::int n, bool_and(expira_em > now()) prazo, bool_and(confirmado_em is null) unico from verificacao_email where id_usuario = ${conta.id_usuario}`,
    );
    expect(token.n, 'link de confirmação com prazo').toBe(1);
    expect(token.prazo).toBe(true);
    const [fila] = await sql<{ n: number }>(
      `select count(*)::int n from notificacao where id_usuario = ${conta.id_usuario} and tipo_evento = 'verificacao_email' and canal = 'email'`,
    );
    expect(fila.n, 'e-mail de confirmação na fila de envio').toBe(1);
  });

  test('CT-02 senha curta: recusa com a mensagem do TCC', async ({ request }) => {
    const email = emailUnico('ct02');
    const resposta = await cadastrar(request, { nome: 'Pessoa de Teste', email, senha: 'abc1234', aceiteTermos: true });
    expect(resposta.status()).toBe(400);
    expect(await mensagem(resposta)).toContain('A senha precisa ter pelo menos 8 caracteres.');
    expect((await sql(`select 1 from usuario where email = '${email}'`)).length, 'nada gravado').toBe(0);
  });

  test('CT-03 cadastro sem aceite dos Termos: a API recusa mesmo chamada direto', async ({ request }) => {
    const email = emailUnico('ct03');
    for (const aceite of [false, undefined]) {
      const resposta = await cadastrar(request, { nome: 'Pessoa de Teste', email, senha: 'senhaboa1', ...(aceite === undefined ? {} : { aceiteTermos: aceite }) });
      expect(resposta.status()).toBe(400);
      expect(await mensagem(resposta)).toContain('É preciso aceitar o Termo de Uso para criar a conta.');
    }
    expect((await sql(`select 1 from usuario where email = '${email}'`)).length, 'nada gravado').toBe(0);
  });

  test('CT-04 login inválido: mensagem genérica, sem dizer qual campo errou', async ({ request }) => {
    const ip = ipNovo();
    const esperada = "E-mail ou senha inválidos. Tente novamente ou clique em 'Esqueceu a senha?'.";
    const senhaErrada = await request.post(`${URL_API}/auth/login`, { data: { email: CONTAS.fernanda, senha: 'senha-errada' }, headers: { 'X-Forwarded-For': ip } });
    const emailInexistente = await request.post(`${URL_API}/auth/login`, { data: { email: emailUnico('naoexiste'), senha: 'senha-errada' }, headers: { 'X-Forwarded-For': ip } });
    expect(senhaErrada.status()).toBe(401);
    expect(emailInexistente.status()).toBe(401);
    expect(await mensagem(senhaErrada)).toBe(esperada);
    expect(await mensagem(emailInexistente)).toBe(esperada);
  });

  test('CT-05 bloqueio por tentativas: 5 erros bloqueiam por 15 minutos, e a senha certa também é recusada', async ({ request }) => {
    const email = emailUnico('ct05');
    expect((await cadastrar(request, { nome: 'Pessoa Bloqueio', email, senha: 'senhaboa1', aceiteTermos: true })).status()).toBe(201);
    const tentar = (senha: string) => request.post(`${URL_API}/auth/login`, { data: { email, senha }, headers: { 'X-Forwarded-For': ipNovo() } });
    for (let i = 0; i < 5; i++) expect((await tentar('senha-errada')).status()).toBe(401);

    const [conta] = await sql<{ minutos: number }>(
      `select round(extract(epoch from (bloqueado_ate - now())) / 60)::int minutos from usuario where email = '${email}'`,
    );
    expect(conta.minutos, 'bloqueio de 15 minutos').toBeGreaterThanOrEqual(14);
    expect(conta.minutos).toBeLessThanOrEqual(15);

    const certa = await tentar('senhaboa1');
    expect(certa.status()).toBe(401);
    expect(await mensagem(certa)).toMatch(
      /^Conta temporariamente bloqueada por excesso de tentativas\. Tente novamente após \d{2}\/\d{2}\/\d{4} - \d{2}:\d{2}\.$/,
    );
  });

  test('CT-06 link de recuperação reutilizado: recusado com a mensagem do TCC', async ({ request }) => {
    const email = emailUnico('ct06');
    expect((await cadastrar(request, { nome: 'Pessoa Recuperação', email, senha: 'senhaboa1', aceiteTermos: true })).status()).toBe(201);
    const pedido = await request.post(`${URL_API}/auth/esqueci-senha`, { data: { email }, headers: { 'X-Forwarded-For': ipNovo() } });
    expect(pedido.ok()).toBe(true);
    // Em desenvolvimento o Nest devolve o token (o e-mail de teste não sai da máquina).
    const { tokenRecuperacaoSenhaDev: token } = (await pedido.json()) as { tokenRecuperacaoSenhaDev: string };
    expect(token).toBeTruthy();

    const usar = () => request.post(`${URL_API}/auth/redefinir-senha`, { data: { token, senha: 'senhanova1' }, headers: { 'X-Forwarded-For': ipNovo() } });
    expect((await usar()).ok(), 'primeiro uso aceito').toBe(true);
    const segundo = await usar();
    expect(segundo.status()).toBe(400);
    expect(await mensagem(segundo)).toBe('Link de redefinição inválido, expirado ou já usado. Peça um novo.');
  });
});

test.describe('Campanha', () => {
  test('CT-08 meta abaixo do mínimo: criação recusada com a mensagem do TCC', async ({ request }) => {
    const token = await entrarPelaApi(request, CONTAS.ana);
    const [area] = await sql<{ id: number }>('select id_area_conhecimento id from area_conhecimento where id_pai is not null order by 1 limit 1');
    const resposta = await request.post(`${URL_API}/campanha`, {
      data: { titulo: `Meta baixa ${Date.now()}`, idAreaConhecimento: area.id, modelo: 'flexivel', metaFinanceira: 100 },
      headers: comToken(token),
    });
    expect(resposta.status()).toBe(400);
    expect(await mensagem(resposta)).toBe('A meta financeira precisa ser de pelo menos R$ 500,00.');
  });

  test('CT-09 campanha enviada para aprovação fica fora da vitrine pública', async ({ request }) => {
    // Campanha 14 (rejeitada, da Patrícia, com reenvio sobrando): ela reenvia e um visitante consulta a lista.
    const token = await entrarPelaApi(request, CONTAS.patricia);
    const envio = await request.post(`${URL_API}/campanha/14/enviar`, { headers: comToken(token) });
    expect(envio.ok(), await envio.text()).toBe(true);
    const [linha] = await sql<{ status: string }>('select status from campanha where id_campanha = 14');
    expect(linha.status).toBe('aguardando_aprovacao');

    const lista = await request.get(`${URL_API}/campanha`, { headers: { 'X-Forwarded-For': ipNovo() } });
    expect(lista.ok()).toBe(true);
    const corpo = (await lista.json()) as { dados?: { idCampanha: number; status: string }[] } | { idCampanha: number; status: string }[];
    const campanhas = Array.isArray(corpo) ? corpo : (corpo.dados ?? []);
    expect(campanhas.length).toBeGreaterThan(0);
    expect(campanhas.map((c) => c.idCampanha)).not.toContain(14);
    expect(campanhas.filter((c) => ['aguardando_aprovacao', 'rascunho', 'rejeitado'].includes(c.status))).toEqual([]);
  });

  test('CT-10 rejeição sem justificativa: bloqueada', async ({ request }) => {
    const token = await entrarPelaApi(request, CONTAS.admin);
    for (const justificativa of ['', '  ']) {
      const resposta = await request.post(`${URL_API}/campanha/17/rejeitar`, { data: { justificativa }, headers: comToken(token) });
      expect(resposta.status()).toBe(400);
      expect(await mensagem(resposta)).toContain('A justificativa da rejeição é obrigatória');
    }
    const [linha] = await sql<{ status: string }>('select status from campanha where id_campanha = 17');
    expect(linha.status, 'campanha continua na fila').toBe('aguardando_aprovacao');
  });

  test('CT-11 autoaprovação: o pesquisador dono recebe 403 e nada muda', async ({ request }) => {
    const token = await entrarPelaApi(request, CONTAS.gabriel);
    const resposta = await request.post(`${URL_API}/campanha/17/aprovar`, { headers: comToken(token) });
    expect(resposta.status()).toBe(403);
    const [linha] = await sql<{ status: string; aprovado_em: string | null }>('select status, aprovado_em from campanha where id_campanha = 17');
    expect(linha).toEqual({ status: 'aguardando_aprovacao', aprovado_em: null });
  });

  test('CT-11 (regra nova) o administrador dono da campanha também não aprova a própria', async ({ request }) => {
    // Campanha 19 passa, só neste teste, a ser do admin; no fim volta para o dono original.
    const [{ dono }] = await sql<{ dono: number }>('select id_usuario dono from campanha where id_campanha = 19');
    await sql("SET session_replication_role = replica; UPDATE campanha SET id_usuario = 1 WHERE id_campanha = 19; SET session_replication_role = origin;");
    try {
      const token = await entrarPelaApi(request, CONTAS.admin);
      const resposta = await request.post(`${URL_API}/campanha/19/aprovar`, { headers: comToken(token) });
      expect(resposta.status()).toBe(403);
      expect(await mensagem(resposta)).toBe('Você não pode aprovar a sua própria campanha. Outro administrador precisa fazer a aprovação.');
      const [linha] = await sql<{ status: string }>('select status from campanha where id_campanha = 19');
      expect(linha.status).toBe('aguardando_aprovacao');
    } finally {
      await sql(`SET session_replication_role = replica; UPDATE campanha SET id_usuario = ${dono} WHERE id_campanha = 19; SET session_replication_role = origin;`);
    }
  });
});

test.describe('Contribuição', () => {
  test('CT-13 contribuição abaixo do mínimo: recusada, sem cobrança no provedor', async ({ request }) => {
    const antes = await sql<{ n: number }>('select count(*)::int n from contribuicao');
    const resposta = await request.post(`${URL_API}/contribuicao`, {
      data: { idCampanha: 3, valor: 4.99, meioPagamento: 'pix', aceiteTermos: true, cienteModeloFlexivel: true },
      headers: { 'X-Forwarded-For': ipNovo() },
    });
    expect(resposta.status()).toBe(400);
    expect(await mensagem(resposta)).toBe('O valor da contribuição precisa ser de pelo menos R$ 5,00.');
    const depois = await sql<{ n: number }>('select count(*)::int n from contribuicao');
    expect(depois[0].n, 'nenhuma contribuição gravada').toBe(antes[0].n);
    const corpo = (await resposta.json()) as Record<string, unknown>;
    expect(JSON.stringify(corpo)).not.toMatch(/qr|pixCopiaECola|payload/i);
  });
});

test('senha do seed confere (sanidade do ambiente)', async ({ request }) => {
  expect(await entrarPelaApi(request, CONTAS.admin, SENHA)).toBeTruthy();
});
