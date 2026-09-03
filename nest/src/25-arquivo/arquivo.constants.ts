// Lista FECHADA de tipos aceitos — SVG nunca entra aqui de propósito: um
// SVG pode conter <script> embutido, então aceitar upload de SVG num site
// com login é abrir um vetor de roubo de sessão pra qualquer visitante que
// abrir o arquivo. Ver doc de arquitetura, seção "O risco de segurança de
// verdade desse módulo".
export const TIPOS_MIME_PERMITIDOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type TipoMimePermitido = (typeof TIPOS_MIME_PERMITIDOS)[number];

export const EXTENSAO_POR_MIME: Record<TipoMimePermitido, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

// Tetos de sanidade por tipo — dá pra ajustar por variável de config no
// futuro (configuracoes, módulo 11) se algum dia precisar mudar sem
// deploy; por ora são constantes porque nenhuma tela do painel pediu isso.
// Baixados de 10MB/20MB pra 8MB/5MB (01-09-2026, decisão Lucas +
// discussão Claude Web/Claude Code sobre otimização de storage): o
// projeto roda no plano grátis do Supabase Storage, 1GB de espaço TOTAL
// — um teto de 20MB por PDF deixava um único upload malicioso ocupar 2%
// da cota inteira. Imagem cai menos (8MB é folga de sobra pra foto de
// celular sem tratar nenhuma, o processamento em confirmar-upload já
// reduz o que sobra depois pra uma fração disso).
export const TAMANHO_MAXIMO_BYTES_POR_MIME: Record<TipoMimePermitido, number> =
  {
    'image/jpeg': 8 * 1024 * 1024,
    'image/png': 8 * 1024 * 1024,
    'image/webp': 8 * 1024 * 1024,
    'application/pdf': 5 * 1024 * 1024,
  };

// Teto absoluto usado só na validação de forma do DTO de iniciar-upload
// (o teto de VERDADE, por tipo, é conferido no service — ver
// arquivo.service.iniciar-upload.ts) — existe só pra rejeitar valores
// absurdos (ex.: alguém mandando "tamanhoBytes": 999999999999) antes de
// qualquer lógica de negócio rodar.
export const TAMANHO_MAXIMO_BYTES_ABSOLUTO = Math.max(
  ...Object.values(TAMANHO_MAXIMO_BYTES_POR_MIME),
);

// Bytes suficientes pra conferir a assinatura mágica de todos os 4 tipos
// aceitos (o maior precisa de 12, WebP) — ver arquivo.assinatura.util.ts.
export const QUANTIDADE_BYTES_ASSINATURA = 16;

// Cota de armazenamento por usuário (01-09-2026) — nenhum teto POR
// ARQUIVO protege contra alguém subindo mil arquivos pequenos. Numa
// base de 1GB total (Supabase Storage grátis), isso deixa de ser
// preciosismo: 20 contas maliciosas em 50MB cada já tomam a cota
// inteira. Somado contra `arquivo.tamanho_bytes` (coluna
// `id_usuario_upload`, ver arquivo.service.confirmar-upload.ts).
export const COTA_BYTES_POR_USUARIO = 50 * 1024 * 1024;

// Contextos de upload (01-09-2026) — cada um usa um teto de
// redimensionamento/qualidade diferente em confirmar-upload.ts, porque
// nenhuma tela do sistema mostra avatar maior que uns 96-128px de verdade
// (512px já é folga generosa pra tela retina) enquanto uma capa de
// campanha em destaque pode ocupar a largura inteira de um monitor
// comum. Lista FECHADA de propósito, mesmo espírito de
// TIPOS_MIME_PERMITIDOS — um contexto novo precisa de decisão de
// produto (qual teto?), nunca deveria "vazar" um valor arbitrário vindo
// do cliente.
export const CONTEXTOS_ARQUIVO = ['avatar', 'campanha', 'atualizacao'] as const;
export type ContextoArquivo = (typeof CONTEXTOS_ARQUIVO)[number];

export interface PerfilProcessamentoImagem {
  larguraMaxima: number;
  qualidadeWebp: number;
}

// Números decididos em conversa (Lucas + Claude Web + Claude Code,
// 01-09-2026): nenhuma tela do protótipo de interface usa avatar maior
// que 512px nem imagem de campanha/anexo de atualização maior que
// 1600px de largura útil, mesmo em tela cheia num monitor comum.
// Qualidade WebP 78-80 é visualmente quase indistinguível do original
// pra exibição em tela.
export const PERFIL_PROCESSAMENTO_POR_CONTEXTO: Record<
  ContextoArquivo,
  PerfilProcessamentoImagem
> = {
  avatar: { larguraMaxima: 512, qualidadeWebp: 80 },
  campanha: { larguraMaxima: 1600, qualidadeWebp: 78 },
  atualizacao: { larguraMaxima: 1600, qualidadeWebp: 78 },
};
