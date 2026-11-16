// Sobe o Nest dos testes na porta 3101, ligado ao banco local (banco-local.mjs) e aos provedores de TESTE:
//   PAYMENT_PROVIDER=fake  o pagamento é simulado (o "Simular pagamento" confirma o Pix), sem Asaas;
//   EMAIL_PROVIDER=fake    nenhum e-mail sai da máquina; a caixa do Campo de Testes guarda os e-mails na memória.
// O resto (chave do JWT, chaves do CPF) vem do nest/.env, lido aqui e passado por variável de ambiente, porque o Nest
// roda com a pasta testes-e2e/.estado como pasta atual: o arquivo de memória do pagamento falso (.fake-gateway.json)
// fica lá, longe do que o Lucas usa no dia a dia.
//
// Compila o Nest antes (nest build) para testar sempre o código atual.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PORTA_NEST = 3101;
const PASTA_NEST = fileURLToPath(new URL('../../nest/', import.meta.url));
const PASTA_ESTADO = fileURLToPath(new URL('../.estado/nest', import.meta.url));
fs.rmSync(PASTA_ESTADO, { recursive: true, force: true });
fs.mkdirSync(PASTA_ESTADO, { recursive: true });

function lerEnv(caminho) {
  const valores = {};
  if (!fs.existsSync(caminho)) return valores;
  for (const linha of fs.readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    valores[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return valores;
}

const doEnv = lerEnv(`${PASTA_NEST}.env`);
const env = {
  ...process.env,
  JWT_SECRET: doEnv.JWT_SECRET ?? 'segredo-so-dos-testes-e2e',
  JWT_ACCESS_EXPIRES_IN: doEnv.JWT_ACCESS_EXPIRES_IN ?? '15m',
  CPF_ENCRYPTION_KEY: doEnv.CPF_ENCRYPTION_KEY ?? '',
  CPF_INDEX_KEY: doEnv.CPF_INDEX_KEY ?? '',
  // O armazenamento de arquivos continua o do .env: os testes não enviam arquivo nenhum.
  ...Object.fromEntries(Object.entries(doEnv).filter(([chave]) => chave.startsWith('STORAGE_'))),
  PORT: String(PORTA_NEST),
  DATABASE_URL: 'postgres://app_nestjs:x@127.0.0.1:5434/postgres',
  PAYMENT_PROVIDER: 'fake',
  EMAIL_PROVIDER: 'fake',
  EMAIL_REDIRECIONAR_PARA: '',
  EMAIL_REMETENTE: 'testes@crowdacademico.local',
  PAINEL_URL: 'http://localhost:5175',
  NODE_ENV: 'development',
};

if (!process.env.SEM_BUILD) {
  const build = spawnSync('npx nest build', { cwd: PASTA_NEST, shell: true, stdio: 'inherit' });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const nest = spawn(process.execPath, [`${PASTA_NEST}dist/main.js`], { cwd: PASTA_ESTADO, env, stdio: 'inherit' });
nest.on('exit', (codigo) => process.exit(codigo ?? 0));
const parar = () => nest.kill();
process.on('SIGINT', parar);
process.on('SIGTERM', parar);
