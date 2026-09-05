// aplicar-migrations.script.ts - NÃO é um provider do Nest (sem @Injectable,
// nunca importado por nenhum módulo). É um script standalone, rodado à mão
// via `npm run db:migrate` (dentro de nest/), pra resolver um problema real:
// hoje os 8 arquivos de arquivos_banco_dados/*.sql são colados manualmente
// no SQL Editor do Supabase, sem nenhum registro de QUAL arquivo já rodou
// em QUAL banco - com Lucas e Alexia em bancos Supabase separados, não
// existe garantia nenhuma de que os dois estão no mesmo estado.
//
// O que este script faz, e não faz:
// - Cria (se não existir) uma tabela `schema_migrations` - o "livro de
//   registro" de quais arquivos já rodaram, quando, e com qual hash de
//   conteúdo. Essa tabela é gerenciada só por este script, não faz parte
//   do schema de negócio (por isso não está em nenhum dos 8 arquivos
//   numerados - ela PRECISA existir antes de qualquer um deles ser
//   rastreado, então não pode depender de nenhum deles).
// - Lê os 8 arquivos .sql na ordem (01 a 08), calcula um hash SHA-256 do
//   conteúdo de cada um, e decide: nunca rodou → aplica e registra; já
//   rodou com o MESMO conteúdo → pula; já rodou mas o conteúdo MUDOU
//   desde então → avisa e para, nunca reaplica sozinho (evitar rodar de
//   novo um arquivo que já tem dado em cima seria perigoso).
// - NÃO substitui o `07_seed_dados.sql`/os outros arquivos por um formato
//   novo - eles continuam exatamente como estão, texto puro. Este script
//   só adiciona o "livro de registro" por cima.
// - NÃO converte pra Kysely query builder - os arquivos são executados
//   como SQL bruto, verbatim, via `pg` (o driver por baixo do Kysely
//   neste projeto), não via `.selectFrom()`/etc. Não tem nada aqui pra
//   "construir" - são blocos de SQL já prontos, com função/trigger em
//   `$$...$$`, e o jeito mais confiável de rodar isso é mandar o texto
//   inteiro pro Postgres de uma vez (protocolo "simple query" do driver
//   pg, que suporta múltiplas instruções separadas por `;` numa
//   chamada só - só funciona assim quando NÃO se usa parâmetro
//   nenhum, que é exatamente o nosso caso aqui).
//
// Conexão SEPARADA da app_nestjs, de propósito: DATABASE_URL_MIGRATIONS
// (nunca DATABASE_URL) - app_nestjs é propositalmente sem privilégio de
// DDL (CREATE TABLE/TRIGGER/POLICY), é o que garante que a RLS vale pra
// ela em runtime (ver DatabaseModule.onModuleInit, database.module.ts).
// Rodar migration precisa de uma credencial com privilégio de verdade -
// a mesma que já é usada manualmente no SQL Editor do Supabase hoje.
//
// Nunca roda sozinho: só quando alguém digita `npm run db:migrate` (ou
// `npm run db:migrate:adotar`) - não faz parte do boot do servidor
// (main.ts nunca importa este arquivo).
import { createHash } from 'crypto';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { config as carregarVariaveisDeAmbiente } from 'dotenv';
import { Pool } from 'pg';

carregarVariaveisDeAmbiente();

const PASTA_ARQUIVOS_SQL = join(__dirname, '../../../../arquivos_banco_dados');

const SQL_CRIAR_TABELA_CONTROLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
      nome_arquivo TEXT PRIMARY KEY,
      hash         TEXT NOT NULL,
      aplicado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      aplicado_por TEXT NOT NULL DEFAULT current_user
  );
`;

// Só os 8 arquivos numerados (`01_...` a `08_...`) - NUNCA `ATUALIZAR O
// SUPABASE.sql` (achado do Lucas, 05-09-2026, rodando `--adotar` de
// verdade: o filtro antigo, "termina em .sql", pegava qualquer .sql da
// pasta, inclusive esse). `ATUALIZAR O SUPABASE.sql` é um rascunho VIVO -
// cresce toda vez que alguém adiciona um ajuste pequeno (ex.: RF-108,
// limites de upload) - tratar ele como um dos 8 faria o hash mudar a cada
// adição, disparando o aviso de "conteúdo mudou" pra sempre, sem nunca
// fazer sentido reaplicar o arquivo INTEIRO de uma vez.
function listarArquivosSqlEmOrdem(): string[] {
  return readdirSync(PASTA_ARQUIVOS_SQL)
    .filter((nome) => /^\d{2}_.*\.sql$/.test(nome))
    .sort(); // '01_...' a '08_...' - ordem alfabética já é a ordem certa (prefixo numérico com 2 dígitos)
}

function calcularHash(conteudo: string): string {
  return createHash('sha256').update(conteudo).digest('hex');
}

function abrirConexaoDeMigration(): Pool {
  const connectionString = process.env.DATABASE_URL_MIGRATIONS;
  if (!connectionString) {
    console.error(
      'DATABASE_URL_MIGRATIONS não definida no .env - precisa de uma credencial ' +
        'com privilégio de DDL (a mesma que você já usa manualmente no SQL Editor ' +
        'do Supabase), separada da DATABASE_URL normal (essa é do app_nestjs, sem ' +
        'privilégio de DDL de propósito). Ver tutorial-rodar-projeto.md.',
    );
    process.exit(1);
  }
  return new Pool({ connectionString });
}

// `--adotar`: NÃO executa nenhum arquivo - só grava em schema_migrations
// que cada um dos 8 "já estava aplicado" (com o hash de agora), assumindo
// que o banco já tem tudo (rodado manualmente até hoje). É o passo de
// "dia zero": tanto Lucas quanto Alexia rodam isso UMA VEZ, cada um no
// próprio banco, pra começar a rastrear a partir de agora - sem isso, a
// primeira chamada normal de `npm run db:migrate` tentaria recriar do
// zero as 42 tabelas que já existem e falharia.
async function adotar(pool: Pool): Promise<void> {
  const arquivos = listarArquivosSqlEmOrdem();
  for (const nomeArquivo of arquivos) {
    const conteudo = readFileSync(
      join(PASTA_ARQUIVOS_SQL, nomeArquivo),
      'utf-8',
    );
    const hash = calcularHash(conteudo);
    await pool.query(
      `INSERT INTO schema_migrations (nome_arquivo, hash) VALUES ($1, $2)
       ON CONFLICT (nome_arquivo) DO UPDATE SET hash = EXCLUDED.hash`,
      [nomeArquivo, hash],
    );
    console.log(`Marcado como já aplicado: ${nomeArquivo}`);
  }
  console.log(
    '\nAdoção concluída - daqui pra frente, "npm run db:migrate" só aplica o que ' +
      'for realmente novo. Isto NÃO confere se o banco de verdade tem tudo que os ' +
      'arquivos descrevem - só estabelece a linha de base a partir de agora.',
  );
}

// Modo normal: aplica o que ainda não rodou, avisa (sem aplicar) o que
// mudou desde a última vez.
async function aplicar(pool: Pool): Promise<void> {
  const arquivos = listarArquivosSqlEmOrdem();
  let algumPendente = false;

  for (const nomeArquivo of arquivos) {
    const conteudo = readFileSync(
      join(PASTA_ARQUIVOS_SQL, nomeArquivo),
      'utf-8',
    );
    const hash = calcularHash(conteudo);

    const resultado = await pool.query<{ hash: string }>(
      'SELECT hash FROM schema_migrations WHERE nome_arquivo = $1',
      [nomeArquivo],
    );

    if (resultado.rows.length === 0) {
      algumPendente = true;
      console.log(`Aplicando ${nomeArquivo}...`);
      await pool.query(conteudo);
      await pool.query(
        'INSERT INTO schema_migrations (nome_arquivo, hash) VALUES ($1, $2)',
        [nomeArquivo, hash],
      );
      console.log(`  OK - aplicado e registrado.`);
    } else if (resultado.rows[0].hash !== hash) {
      console.warn(
        `  ATENÇÃO: ${nomeArquivo} já foi aplicado antes, mas o conteúdo do arquivo ` +
          `mudou desde então (hash diferente do registrado). NÃO reaplicado ` +
          `automaticamente - confira manualmente o que mudou e decida o que rodar.`,
      );
    } else {
      console.log(`${nomeArquivo}: já aplicado, sem mudança. Pulado.`);
    }
  }

  if (!algumPendente) {
    console.log('\nNada novo pra aplicar - banco já está em dia.');
  }
}

async function main(): Promise<void> {
  const modoAdotar = process.argv.includes('--adotar');
  const pool = abrirConexaoDeMigration();

  try {
    await pool.query(SQL_CRIAR_TABELA_CONTROLE);
    if (modoAdotar) {
      await adotar(pool);
    } else {
      await aplicar(pool);
    }
  } finally {
    await pool.end();
  }
}

main().catch((erro: unknown) => {
  console.error('Falha ao rodar migrations:', erro);
  process.exit(1);
});
