import { expect, test, type Page } from '@playwright/test';
import { anexo, CONTAS, entrarPelaTela, ipNovo } from '../apoio';

// CT-16 do TCC (RNF-11): a listagem de campanhas, os detalhes de uma campanha e o painel do usuário, carregados dez
// vezes depois de uma requisição de aquecimento. O tempo de cada carga vai do clique (navegação) até o conteúdo
// principal aparecer na tela, com os dados vindos da API. A média precisa ficar abaixo de 3 segundos; a primeira carga
// (aquecimento) é registrada à parte.
//
// Medido na máquina, com banco, Nest e React locais: é o tempo do sistema, sem a rede da hospedagem.

const REPETICOES = 10;
const LIMITE_MS = 3000;

async function medir(page: Page, rota: string, pronto: (p: Page) => ReturnType<Page['locator']>): Promise<number> {
  const inicio = performance.now();
  await page.goto(rota, { waitUntil: 'commit' });
  await pronto(page).first().waitFor({ state: 'visible', timeout: 15_000 });
  return performance.now() - inicio;
}

const CENARIOS = [
  { nome: 'Listagem de campanhas (Explorar)', rota: '/explorar', conta: null, pronto: (p: Page) => p.locator('article.cartao-campanha') },
  { nome: 'Detalhes de uma campanha', rota: '/campanha/3', conta: null, pronto: (p: Page) => p.getByRole('heading', { name: 'Pesquisador Responsável' }) },
  { nome: 'Painel do usuário (Minha Conta)', rota: '/minha-conta/perfil', conta: 'fernanda' as const, pronto: (p: Page) => p.getByText('Fernanda Souza Lima', { exact: true }) },
];

for (const cenario of CENARIOS) {
  test(`CT-16 ${cenario.nome}`, async ({ page }) => {
    await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': ipNovo() });
    if (cenario.conta) await entrarPelaTela(page, CONTAS[cenario.conta]);
    const aquecimento = await medir(page, cenario.rota, cenario.pronto);
    const tempos: number[] = [];
    for (let i = 0; i < REPETICOES; i++) tempos.push(await medir(page, cenario.rota, cenario.pronto));
    const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;

    await test.info().attach(
      'desempenho',
      anexo('desempenho', {
        cenario: cenario.nome,
        rota: cenario.rota,
        aquecimentoMs: Math.round(aquecimento),
        temposMs: tempos.map(Math.round),
        mediaMs: Math.round(media),
        maximoMs: Math.round(Math.max(...tempos)),
      }),
    );
    expect(media, `média de ${REPETICOES} cargas (ms)`).toBeLessThan(LIMITE_MS);
  });
}
