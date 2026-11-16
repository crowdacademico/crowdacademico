// npm run relatorio: roda TUDO e grava um relatório com data e hora em resultados/ (é de lá que saem os números para a
// banca). Três partes:
//   1. a suíte PGlite das regras do banco (informacoes/testes-banco, `npm test`), se a pasta existir nesta máquina;
//   2. a suíte do Playwright (interface, API, acessibilidade e desempenho), que sobe banco, Nest e React sozinha;
//   3. o resumo: casos por suíte, o tempo médio do CT-16 e as violações do axe-core por tela.
// Com --sem-banco, pula a parte 1; com --so-relatorio, só relê .estado/resultado.json da última rodada.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const AQUI = fileURLToPath(new URL('.', import.meta.url));
const PASTA_BANCO = fileURLToPath(new URL('../informacoes/testes-banco/', import.meta.url));
const args = process.argv.slice(2);
const soRelatorio = args.includes('--so-relatorio');
const inicio = new Date();

// ---------- 1. Suíte PGlite ----------
let banco = null;
if (!soRelatorio && !args.includes('--sem-banco') && fs.existsSync(`${PASTA_BANCO}executar.mjs`)) {
  console.log('Rodando a suíte PGlite das regras do banco...');
  const t0 = Date.now();
  const r = spawnSync('npm test', { cwd: PASTA_BANCO, shell: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const saida = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const suites = [...saida.matchAll(/^(OK|FALHOU)\s+(\S+)\s+(\d+|\?) casos, (\d+|\?) falha\(s\)/gm)].map((m) => ({
    suite: m[2],
    ok: m[1] === 'OK',
    casos: Number(m[3]) || 0,
    falhas: Number(m[4]) || 0,
  }));
  banco = {
    segundos: Math.round((Date.now() - t0) / 1000),
    suites,
    casos: suites.reduce((a, s) => a + s.casos, 0),
    falhas: suites.reduce((a, s) => a + s.falhas, 0),
  };
  console.log(`PGlite: ${suites.length} suítes, ${banco.casos} casos, ${banco.falhas} falha(s).`);
}

// ---------- 2. Playwright ----------
if (!soRelatorio) {
  console.log('Rodando a suíte do Playwright (sobe banco, Nest e React)...');
  spawnSync('npx playwright test', { cwd: AQUI, shell: true, stdio: 'inherit' });
}

// ---------- 3. Relatório ----------
const resultado = JSON.parse(fs.readFileSync(`${AQUI}.estado/resultado.json`, 'utf8'));
const testes = [];
const andar = (suite, caminho = []) => {
  for (const filha of suite.suites ?? []) andar(filha, suite.title ? [...caminho, suite.title] : caminho);
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests) {
      const ultimo = t.results.at(-1) ?? {};
      const anexos = Object.fromEntries(
        (ultimo.attachments ?? [])
          .filter((a) => a.contentType === 'application/json' && a.body)
          .map((a) => [a.name, JSON.parse(Buffer.from(a.body, 'base64').toString('utf8'))]),
      );
      testes.push({
        projeto: t.projectName,
        nome: [...caminho, suite.title, spec.title].filter(Boolean).join(' › '),
        status: t.status === 'expected' ? 'passou' : t.status === 'skipped' ? 'pulado' : 'falhou',
        erro: (ultimo.error?.message ?? '').replace(/\u001b\[[0-9;]*m/g, '').split('\n').slice(0, 4).join(' ').slice(0, 300),
        anexos,
      });
    }
  }
};
for (const s of resultado.suites ?? []) andar(s);

const PROJETOS = ['interface', 'api', 'acessibilidade', 'desempenho'];
const contar = (lista) => ({
  total: lista.length,
  passou: lista.filter((t) => t.status === 'passou').length,
  falhou: lista.filter((t) => t.status === 'falhou').length,
  pulado: lista.filter((t) => t.status === 'pulado').length,
});
const porProjeto = Object.fromEntries(PROJETOS.map((p) => [p, contar(testes.filter((t) => t.projeto === p))]));
const quando = new Date(resultado.stats?.startTime ?? inicio);
const dataHora = quando.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

const desempenho = testes.map((t) => t.anexos.desempenho).filter(Boolean);
const axe = testes.map((t) => t.anexos.axe).filter(Boolean);
const IMPACTOS = ['critical', 'serious', 'moderate', 'minor'];

let md = `# Relatório dos testes do CrowdAcadêmico\n\n`;
md += `- **Execução do Playwright:** ${dataHora} (duração ${Math.round((resultado.stats?.duration ?? 0) / 1000)} s)\n`;
md += `- **Ambiente:** banco Postgres local descartável (arquivos 01 a 08 com o seed), Nest e React locais, pagamento e e-mail de TESTE.\n\n`;

md += `## Resumo\n\n| Suíte | Casos | Passaram | Falharam | Pulados |\n|---|---|---|---|---|\n`;
if (banco) md += `| PGlite: regras do banco (${banco.suites.length} suítes, ${banco.segundos} s) | ${banco.casos} | ${banco.casos - banco.falhas} | ${banco.falhas} | 0 |\n`;
const ROTULO = { interface: 'Interface (Playwright)', api: 'Roteiros da API (CT-01 a CT-13)', acessibilidade: 'Acessibilidade (axe-core) e CT-15', desempenho: 'Desempenho (CT-16)' };
for (const p of PROJETOS) md += `| ${ROTULO[p]} | ${porProjeto[p].total} | ${porProjeto[p].passou} | ${porProjeto[p].falhou} | ${porProjeto[p].pulado} |\n`;

md += `\n## CT-16: tempo de resposta (RNF-11, limite de 3 s)\n\n| Operação | Aquecimento | Média de 10 cargas | Maior | Resultado |\n|---|---|---|---|---|\n`;
for (const d of desempenho) md += `| ${d.cenario} | ${d.aquecimentoMs} ms | **${d.mediaMs} ms** | ${d.maximoMs} ms | ${d.mediaMs < 3000 ? 'abaixo de 3 s' : 'ACIMA de 3 s'} |\n`;

md += `\n## axe-core: violações por tela\n\nNúmero de ocorrências por impacto (claro/escuro, computador 1440 px e celular 390 px). Só critical e serious reprovam.\n\n`;
md += `| Tela | Tema | Largura | critical | serious | moderate | minor | Rolagem lateral | Regras |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const a of axe) {
  const conta = (i) => a.violacoes.filter((v) => v.impacto === i).reduce((s, v) => s + v.ocorrencias, 0);
  const regras = a.violacoes.map((v) => `${v.id} (${v.impacto})`).join(', ') || 'nenhuma';
  md += `| ${a.pagina} | ${a.tema} | ${a.largura} | ${IMPACTOS.map(conta).join(' | ')} | ${a.largura === 390 ? `${Math.max(0, a.rolagemLateralPx)} px` : '-'} | ${regras} |\n`;
}

md += `\n## Todos os casos\n\n| Suíte | Caso | Resultado |\n|---|---|---|\n`;
for (const t of testes) md += `| ${t.projeto} | ${t.nome.replace(/\|/g, '/')} | ${t.status}${t.erro ? `: ${t.erro.replace(/\|/g, '/')}` : ''} |\n`;
if (banco) {
  md += `\n## Suíte PGlite por arquivo\n\n| Suíte | Casos | Falhas |\n|---|---|---|\n`;
  for (const s of banco.suites) md += `| ${s.suite} | ${s.casos} | ${s.falhas} |\n`;
}

fs.mkdirSync(`${AQUI}resultados`, { recursive: true });
const pad = (n) => String(n).padStart(2, '0');
const local = new Date(quando.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
const arquivo = `${AQUI}resultados/relatorio-${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}_${pad(local.getHours())}${pad(local.getMinutes())}.md`;
fs.writeFileSync(arquivo, md);
console.log(`\nRelatório gravado: ${arquivo}`);
