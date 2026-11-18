import { defineConfig, devices } from '@playwright/test';

// Testes de ponta a ponta do CrowdAcadêmico. `npm test` sobe tudo sozinho, nesta ordem, em portas próprias (as 3000 e
// 5173 do dia a dia ficam livres):
//   1. banco local descartável (Postgres de verdade, 01 a 08 com o seed) .......... 5434, e /sql em 5498;
//   2. Nest compilado, com pagamento e e-mail de TESTE ............................ 3101;
//   3. React (Vite), apontando para o Nest de teste ............................... 5175;
//   4. o mesmo React com o ID do login com Google, só para o teste do botão ........ 5176.
// Os quatro projetos dividem o mesmo banco da rodada; cada teste cria o que precisa (contas com e-mail único) e não
// depende da ordem dos outros.
export const URL_SITE = 'http://localhost:5175';
export const URL_API = 'http://localhost:3101';
export const URL_SITE_COM_GOOGLE = 'http://localhost:5176';

export default defineConfig({
  testDir: './testes',
  outputDir: './.estado/resultados-testes',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // Um de cada vez: os servidores são locais e a medição de tempo (CT-16) não pode disputar a máquina.
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['json', { outputFile: './.estado/resultado.json' }],
    ['html', { outputFolder: './.estado/relatorio-html', open: 'never' }],
  ],
  use: {
    baseURL: URL_SITE,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'api', testMatch: /api\/.*\.spec\.ts/, use: { baseURL: URL_API } },
    { name: 'interface', testMatch: /interface\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'acessibilidade', testMatch: /acessibilidade\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'desempenho', testMatch: /desempenho\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'node ambiente/banco-local.mjs',
      url: 'http://127.0.0.1:5498/pronto',
      timeout: 180_000,
      reuseExistingServer: Boolean(process.env.REUSAR),
      stdout: 'pipe',
    },
    {
      command: 'node ambiente/iniciar-nest.mjs',
      url: `${URL_API}/health`,
      timeout: 240_000,
      reuseExistingServer: Boolean(process.env.REUSAR),
      stdout: 'pipe',
    },
    {
      command: 'npx vite --port 5175 --strictPort',
      cwd: '../react',
      url: URL_SITE,
      timeout: 120_000,
      reuseExistingServer: Boolean(process.env.REUSAR),
      // Sem o ID do Google: o botão "Continuar com o Google" não pode aparecer (vazio aqui vence o react/.env).
      env: { VITE_API_URL: URL_API, VITE_GOOGLE_CLIENT_ID: '' },
    },
    {
      // O mesmo React COM o ID do Google (18-11-2026), só para conferir que o botão aparece. O login real do Google não
      // dá para automatizar; o teste bloqueia o script do Google e confere só o lugar do botão.
      command: 'npx vite --port 5176 --strictPort',
      cwd: '../react',
      url: URL_SITE_COM_GOOGLE,
      timeout: 120_000,
      reuseExistingServer: Boolean(process.env.REUSAR),
      env: { VITE_API_URL: URL_API, VITE_GOOGLE_CLIENT_ID: 'cliente-de-teste.apps.googleusercontent.com' },
    },
  ],
});
