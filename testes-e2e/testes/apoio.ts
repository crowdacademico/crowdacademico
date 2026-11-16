import fs from 'node:fs';
import { createRequire } from 'node:module';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

// Peças comuns dos testes de ponta a ponta. Os servidores (banco, Nest e React) sobem pelo playwright.config.ts.

export const URL_SITE = 'http://localhost:5175';
export const URL_API = 'http://localhost:3101';
export const SENHA = 'DevTcc123!';

// Contas do seed (07_seed_dados.sql). Senha de todas: DevTcc123!
export const CONTAS = {
  admin: 'admin@crowdacademico.com.br',
  ana: 'ana.santos@usp.br', // pesquisadora 8, dona das campanhas 1, 2 e 3, com links acadêmicos
  beatriz: 'beatriz.lima@ufmg.br', // pesquisadora 13, dona das campanhas 10 e 11
  patricia: 'patricia.rocha@unifesp.br', // pesquisadora 15, dona da campanha 14 (rejeitada, com reenvio)
  gabriel: 'gabriel.martins@gmail.com', // pesquisador 17, dono da campanha 17 (aguardando aprovação)
  fernanda: 'fernanda.souza@gmail.com', // conta comum (apoiadora)
  marina: 'marina.torres@gmail.com', // conta 21: Termo de Uso pendente de propósito (RF-015)
  vinicius: 'vinicius.ferraz@gmail.com', // pesquisador 16: Termo de Pesquisador pendente de propósito (RF-015)
} as const;

// O SQL roda como postgres no banco local (porta 5498): serve para preparar um caso e conferir o que foi gravado.
export async function sql<T = Record<string, unknown>>(consulta: string): Promise<T[]> {
  const resposta = await fetch('http://127.0.0.1:5498/sql', { method: 'POST', body: consulta });
  const json = (await resposta.json()) as T[] | { erro: string };
  if (!Array.isArray(json)) throw new Error(`SQL: ${json.erro}`);
  return json;
}

// O limite de tentativas do Nest conta por IP (5 logins por minuto). Cada teste se apresenta com um IP próprio no
// X-Forwarded-For (o Nest confia no primeiro proxy, main.ts), como se fossem pessoas diferentes.
let contadorIp = Math.floor(Math.random() * 200);
export function ipNovo(): string {
  contadorIp = (contadorIp + 1) % 250;
  return `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${contadorIp + 1}`;
}

export function emailUnico(prefixo = 'teste'): string {
  return `${prefixo}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@teste.crowdacademico.local`;
}

export async function entrarPelaApi(request: APIRequestContext, email: string, senha = SENHA): Promise<string> {
  const resposta = await request.post(`${URL_API}/auth/login`, {
    data: { email, senha },
    headers: { 'X-Forwarded-For': ipNovo() },
  });
  expect(resposta.status(), `login de ${email}`).toBe(201);
  return ((await resposta.json()) as { accessToken: string }).accessToken;
}

export const comToken = (token: string) => ({ Authorization: `Bearer ${token}`, 'X-Forwarded-For': ipNovo() });

// Login pela tela (o mesmo caminho de uma pessoa).
export async function entrarPelaTela(page: Page, email: string, senha = SENHA): Promise<void> {
  await page.context().setExtraHTTPHeaders({ 'X-Forwarded-For': ipNovo() });
  await page.goto('/login');
  await page.getByLabel('Seu E-mail').fill(email);
  await page.locator('input[type="password"]').fill(senha);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 });
}

// axe-core injetado direto na página (o mesmo pacote que o axe DevTools usa).
const require = createRequire(import.meta.url);
const FONTE_AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

export interface ViolacaoAxe {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
  help: string;
  nodes: { target: string[] }[];
}

export async function rodarAxe(page: Page): Promise<ViolacaoAxe[]> {
  await page.addScriptTag({ content: FONTE_AXE });
  return page.evaluate(async () => {
    // @ts-expect-error axe é global depois do addScriptTag
    const resultado = await window.axe.run(document, { resultTypes: ['violations'] });
    return resultado.violations as ViolacaoAxe[];
  });
}

export const graves = (violacoes: ViolacaoAxe[]) =>
  violacoes.filter((v) => v.impact === 'critical' || v.impact === 'serious');

// Rolagem lateral: a página é mais larga que a janela?
export async function larguraExcedente(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

// Grava um anexo JSON no resultado (o relatório lê daqui).
export function anexo(nome: string, dados: unknown) {
  return { name: nome, contentType: 'application/json', body: Buffer.from(JSON.stringify(dados, null, 1)) };
}
