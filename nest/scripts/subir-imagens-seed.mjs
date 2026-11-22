// Imagens do seed (npm run seed:imagens): envia as capas das campanhas e as fotos das atualizações de demonstração
// (informacoes/Imagens/imagens-seed) para o bucket, nas chaves que o 07_seed_dados.sql grava na tabela `arquivo`
// (seed/capas/<nome>.webp e seed/atualizacoes/<nome>.webp). Rodar uma vez depois de recriar o banco; rodar de novo
// só sobrescreve os mesmos arquivos. Lê STORAGE_* do nest/.env (as mesmas chaves do módulo de arquivos).
import { readFileSync, readdirSync } from 'node:fs';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

function lerEnv(caminho) {
  const valores = {};
  for (const linha of readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) valores[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
  return valores;
}

const env = { ...lerEnv(new URL('../.env', import.meta.url)), ...process.env };
const faltando = ['STORAGE_ENDPOINT', 'STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY', 'STORAGE_BUCKET', 'STORAGE_REGION'].filter(
  (nome) => !env[nome],
);
if (faltando.length > 0) {
  console.error(`Faltam no nest/.env: ${faltando.join(', ')}`);
  process.exit(1);
}

const cliente = new S3Client({
  endpoint: env.STORAGE_ENDPOINT,
  region: env.STORAGE_REGION,
  forcePathStyle: env.STORAGE_FORCE_PATH_STYLE === 'true',
  credentials: { accessKeyId: env.STORAGE_ACCESS_KEY_ID, secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY },
});

const raiz = new URL('../../informacoes/Imagens/imagens-seed/', import.meta.url);
let enviadas = 0;
for (const pasta of ['capas', 'atualizacoes']) {
  for (const nome of readdirSync(new URL(pasta + '/', raiz)).filter((f) => f.endsWith('.webp'))) {
    const chave = `seed/${pasta}/${nome}`;
    await cliente.send(
      new PutObjectCommand({
        Bucket: env.STORAGE_BUCKET,
        Key: chave,
        Body: readFileSync(new URL(`${pasta}/${nome}`, raiz)),
        ContentType: 'image/webp',
      }),
    );
    enviadas += 1;
    console.log('enviada', chave);
  }
}
console.log(`\n${enviadas} imagens no bucket ${env.STORAGE_BUCKET}.`);
