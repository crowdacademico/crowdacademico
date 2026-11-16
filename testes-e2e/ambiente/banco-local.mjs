// Banco descartável dos testes de ponta a ponta: um Postgres de verdade (embedded-postgres), na porta 5434, montado do
// zero a cada rodada com os arquivos 01 a 08 de arquivos_banco_dados (o mesmo banco que a Alexia recria, com o seed).
// Nunca toca no Supabase. O app_nestjs entra com a senha "x", e as regras de RLS e de privilégio valem como no Supabase.
//
// Porta 5498 (HTTP, só na máquina):
//   GET  /pronto  responde 200 quando o banco está montado (o Playwright espera por ele);
//   POST /sql     roda o corpo como postgres e devolve as linhas em JSON (os testes conferem o que a tela gravou).
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import fs from 'node:fs';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

export const PORTA_BANCO = 5434;
export const PORTA_SQL = 5498;

const RAIZ = fileURLToPath(new URL('../../arquivos_banco_dados/', import.meta.url));
const ARQUIVOS = [
  '01_extensoes_enums_tabelas',
  '02_indices',
  '03_funcoes_seguranca',
  '04_rls_policies',
  '05_regras_negocio',
  '06_grants',
  '07_seed_dados',
  '08_trigger_signup_usuario',
];
const PASTA = fileURLToPath(new URL('../.estado/pgdata', import.meta.url));
fs.rmSync(PASTA, { recursive: true, force: true });
fs.mkdirSync(PASTA, { recursive: true });

const servidor = new EmbeddedPostgres({
  databaseDir: PASTA,
  user: 'postgres',
  password: 'postgres',
  port: PORTA_BANCO,
  persistent: false,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: () => {},
});
await servidor.initialise();
await servidor.start();

const adm = new pg.Pool({ connectionString: `postgres://postgres:postgres@127.0.0.1:${PORTA_BANCO}/postgres`, max: 4 });
// Como no Supabase: as extensões moram no esquema "extensions", fora do alcance do app_nestjs.
await adm.query('CREATE SCHEMA IF NOT EXISTS extensions');
for (const arquivo of ARQUIVOS) await adm.query(fs.readFileSync(`${RAIZ}${arquivo}.sql`, 'utf8'));
await adm.query("ALTER ROLE app_nestjs LOGIN PASSWORD 'x'");

http
  .createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/pronto') {
      res.end('ok');
      return;
    }
    let corpo = '';
    req.on('data', (parte) => (corpo += parte));
    req.on('end', async () => {
      try {
        const r = await adm.query(corpo);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(Array.isArray(r) ? r.at(-1).rows : r.rows));
      } catch (erro) {
        res.statusCode = 400;
        res.end(JSON.stringify({ erro: erro.message }));
      }
    });
  })
  .listen(PORTA_SQL, '127.0.0.1');

console.log(`banco local pronto: Postgres na porta ${PORTA_BANCO}, SQL em http://127.0.0.1:${PORTA_SQL}/sql`);

const parar = async () => {
  await adm.end().catch(() => {});
  await servidor.stop().catch(() => {});
  process.exit(0);
};
process.on('SIGINT', parar);
process.on('SIGTERM', parar);
