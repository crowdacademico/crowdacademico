// Cifra/decifra de CPF + índice cego (22-08-2026) - decidido em conversa
// conjunta entre Lucas, Claude Code e Claude Web (Opus 5); registro completo
// do raciocínio em DOCUMENTACAO_BD.md, seção [01-D] `perfil_pesquisador`.
// Resumo curto pra quem só quer usar as funções: CPF precisa poder ser
// DECIFRADO de volta (a API de pagamento/KYC do RF-015 precisa dele), então
// não pode ser hash comum (irreversível). Cifra de verdade é de propósito
// não-determinística - o mesmo CPF cifrado duas vezes dá dois resultados
// diferentes - o que é ótimo pra segurança mas impede comparar/indexar. Por
// isso duas funções separadas: cifrarCpf()/decifrarCpf() (reversível, pra
// KYC) e calcularHashCpf() (determinística, não-reversível, pra UNIQUE e
// busca - "índice cego").
//
// Cifrado no processo do Node (AES-256-GCM, node:crypto nativo), não no
// Postgres (pgcrypto) - decisão consciente: nenhuma trigger/função/policy do
// banco lê cpf_criptografado pra nada (conferido por grep nos 5 arquivos de
// `.sql`), então não existe "consistência com o banco" a preservar cifrando
// lá. Cifrar aqui significa que a chave nunca sai do processo do Nest.
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
} from 'crypto';

const ALGORITMO_CIFRA = 'aes-256-gcm';
const TAMANHO_IV_BYTES = 12; // recomendado pelo próprio node:crypto pra GCM
const VERSAO_FORMATO = 'v1';

// SHA-256 da string do .env, não a string crua - AES-256 exige uma chave de
// EXATAMENTE 32 bytes, e uma frase-segredo digitada à mão (mesmo padrão do
// JWT_SECRET) quase nunca tem 32 bytes de propósito. Hash determinístico
// resolve isso sem exigir que quem configurar o ambiente conte caracteres.
function chaveDeCifra(): Buffer {
  const segredo = process.env.CPF_ENCRYPTION_KEY;
  if (!segredo) {
    throw new Error(
      'CPF_ENCRYPTION_KEY não definida no .env - obrigatória pra cifrar/decifrar CPF. Ver DOCUMENTACAO_BD.md, seção perfil_pesquisador.',
    );
  }
  return createHash('sha256').update(segredo).digest();
}

// HMAC aceita chave de qualquer tamanho nativamente - sem hash extra aqui,
// diferente da chave de cifra acima (que tem uma exigência rígida de 32
// bytes que o HMAC não tem).
function chaveDeIndice(): string {
  const segredo = process.env.CPF_INDEX_KEY;
  if (!segredo) {
    throw new Error(
      'CPF_INDEX_KEY não definida no .env - obrigatória pro índice cego (cpf_hash). Precisa ser DIFERENTE de CPF_ENCRYPTION_KEY (ver DOCUMENTACAO_BD.md sobre por quê).',
    );
  }
  return segredo;
}

// Só dígitos - "123.456.789-09" e "12345678909" viram o mesmo valor antes de
// cifrar/indexar, senão o mesmo CPF gera cpf_hash diferente dependendo de
// como foi digitado, quebrando o UNIQUE na prática.
export function normalizarCpf(cpfBruto: string): string {
  return cpfBruto.replace(/\D/g, '');
}

// Formato salvo: "v1:<iv>:<tag>:<ciphertext>", cada parte em base64. O "v1:"
// não é dado criptográfico, é rótulo de VERSÃO da receita - permite trocar
// de algoritmo/chave no futuro sem exigir migração de tudo de uma vez: linhas
// antigas (v1) e novas (v2, se um dia existir) convivem na mesma coluna,
// decifrarCpf() decide a receita certa pelo prefixo.
export function cifrarCpf(cpfNormalizado: string): string {
  const iv = randomBytes(TAMANHO_IV_BYTES);
  const cifrador = createCipheriv(ALGORITMO_CIFRA, chaveDeCifra(), iv);
  const cifrado = Buffer.concat([
    cifrador.update(cpfNormalizado, 'utf8'),
    cifrador.final(),
  ]);
  const tag = cifrador.getAuthTag();
  return [
    VERSAO_FORMATO,
    iv.toString('base64'),
    tag.toString('base64'),
    cifrado.toString('base64'),
  ].join(':');
}

export function decifrarCpf(valorSalvo: string): string {
  const partes = valorSalvo.split(':');
  if (partes.length !== 4 || partes[0] !== VERSAO_FORMATO) {
    throw new Error(
      `cpf_criptografado num formato desconhecido (esperava prefixo "${VERSAO_FORMATO}:"): "${valorSalvo.slice(0, 20)}...". ` +
        'Se isto veio do seed antigo (placeholder tipo "enc_cpf_001"), o seed precisa ser regravado com valores cifrados de verdade - ver DOCUMENTACAO_BD.md.',
    );
  }
  const [, ivBase64, tagBase64, cifradoBase64] = partes;
  const decifrador = createDecipheriv(
    ALGORITMO_CIFRA,
    chaveDeCifra(),
    Buffer.from(ivBase64, 'base64'),
  );
  decifrador.setAuthTag(Buffer.from(tagBase64, 'base64'));
  const decifrado = Buffer.concat([
    decifrador.update(Buffer.from(cifradoBase64, 'base64')),
    decifrador.final(),
  ]);
  return decifrado.toString('utf8');
}

// Índice cego - HMAC-SHA256, nunca sha256() puro: CPF tem só 10^9
// combinações válidas possíveis (os 2 últimos dígitos são calculados a
// partir dos 9 primeiros), espaço pequeno o bastante pra pré-calcular o hash
// de todos os CPFs possíveis de antemão SE o hash não depender de uma chave
// secreta. O HMAC exige a chave como segundo ingrediente - sem ela, não dá
// pra pré-calcular essa tabela.
export function calcularHashCpf(cpfNormalizado: string): string {
  return createHmac('sha256', chaveDeIndice())
    .update(cpfNormalizado)
    .digest('hex');
}
