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
export const TAMANHO_MAXIMO_BYTES_POR_MIME: Record<TipoMimePermitido, number> =
  {
    'image/jpeg': 10 * 1024 * 1024,
    'image/png': 10 * 1024 * 1024,
    'image/webp': 10 * 1024 * 1024,
    'application/pdf': 20 * 1024 * 1024,
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
