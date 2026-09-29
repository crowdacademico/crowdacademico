// Gera src/services/constant/type/enums-do-banco.gerado.ts: as listas de valores fixos do banco (os ENUMs, como
// status_campanha) para o React usar como tipo, em vez de repetir os valores à mão.
//
// De onde vêm os valores: de nest/src/commons/database/db.types.generated.ts, o arquivo que o kysely-codegen gera
// a partir do banco de verdade (arquivos 01 a 08). O caminho completo é: banco -> db.types.generated.ts (Nest) ->
// este script -> enums-do-banco.gerado.ts (React).
//
// Uso, dentro de react/:
//   npm run gerar:enums              regrava o arquivo do React
//   npm run gerar:enums -- --conferir  não grava; sai com código 1 se o arquivo estiver diferente do que seria gerado
//
// Quando rodar: sempre que um ENUM do banco mudar (valor novo, removido ou renomeado), DEPOIS de regerar o
// db.types.generated.ts do Nest. Depois, `npx tsc` no react/ aponta cada rótulo que falta (os rótulos são
// Record<Tipo, string>, então um valor novo sem rótulo vira erro de compilação).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const ORIGEM = path.resolve(AQUI, '../../nest/src/commons/database/db.types.generated.ts');
const DESTINO = path.resolve(AQUI, '../src/services/constant/type/enums-do-banco.gerado.ts');
const conferir = process.argv.includes('--conferir');

if (!fs.existsSync(ORIGEM)) {
  console.error(`Não achei ${ORIGEM}. Gere antes os tipos do banco no Nest (ver DOCUMENTACAO_BACKEND.md, seção 2.6).`);
  process.exit(1);
}

// Só os tipos que são uma lista de textos fixos: export type StatusCampanha = "a" | "b";
const origem = fs.readFileSync(ORIGEM, 'utf8');
const enums = [...origem.matchAll(/^export type (\w+) = ((?:"[^"]+"\s*\|?\s*)+);$/gm)].map(([, nome, corpo]) => ({
  nome,
  valores: [...corpo.matchAll(/"([^"]+)"/g)].map((m) => m[1]),
}));
if (enums.length === 0) {
  console.error('Nenhuma lista de valores encontrada no arquivo de origem: o formato do kysely-codegen mudou?');
  process.exit(1);
}

// StatusCampanha -> STATUS_CAMPANHA
const constante = (nome) => nome.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();

const blocos = enums.map(
  ({ nome, valores }) =>
    `export const ${constante(nome)} = [${valores.map((v) => `'${v}'`).join(', ')}] as const;\n` +
    `export type ${nome} = (typeof ${constante(nome)})[number];`,
);
const conteudo = `// ARQUIVO GERADO AUTOMATICAMENTE. Não edite à mão: rode \`npm run gerar:enums\` dentro de react/.
// Origem: nest/src/commons/database/db.types.generated.ts, gerado a partir do banco (ver react/scripts/gerar-enums-do-banco.mjs).
// Cada lista é um ENUM do banco, em ordem alfabética; a ordem de exibição e os rótulos ficam nos arquivos de
// constantes de cada módulo.

${blocos.join('\n\n')}
`;

const atual = fs.existsSync(DESTINO) ? fs.readFileSync(DESTINO, 'utf8').replace(/\r\n/g, '\n') : '';
if (conferir) {
  if (atual !== conteudo) {
    console.error('enums-do-banco.gerado.ts está desatualizado: rode `npm run gerar:enums` dentro de react/.');
    process.exit(1);
  }
  console.log(`enums-do-banco.gerado.ts em dia (${enums.length} listas).`);
} else {
  fs.writeFileSync(DESTINO, conteudo);
  console.log(`Gerado ${path.relative(process.cwd(), DESTINO)} (${enums.length} listas).`);
}
