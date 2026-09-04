// Lista FECHADA de tipos aceitos - SVG nunca entra aqui de propósito: um
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

// Tetos de sanidade por tipo - DEFAULT, usado só quando a chave
// correspondente não existir/estiver inativa em `configuracoes` (ver
// ConfiguracaoValorService, commons/configuracao). Configurável pelo
// Painel Admin desde 04-09-2026 (pedido do Lucas: "arquivo não é
// configurável pelo Painel Admin... o administrador deve poder
// estabelecer o limite mínimo e máximo do tamanho dos arquivos") - mesmo
// espírito de tudo mais que já saiu de hardcoded pra `configuracoes`
// (prazo de campanha, limite de denúncia etc.).
//
// Os valores abaixo são só o PONTO DE PARTIDA, herdado da decisão de
// 01-09-2026 (baixados de 10MB/20MB pra 8MB/5MB, projeto no plano
// grátis do Supabase Storage, 1GB de espaço TOTAL) - o valor de
// VERDADE, em produção, é o que estiver em `configuracoes` (ver seed,
// chaves ARQUIVO_TAMANHO_MAXIMO_IMAGEM_BYTES/ARQUIVO_TAMANHO_MAXIMO_
// DOCUMENTO_BYTES).
export const TAMANHO_MAXIMO_BYTES_POR_MIME_PADRAO: Record<
  TipoMimePermitido,
  number
> = {
  'image/jpeg': 8 * 1024 * 1024,
  'image/png': 8 * 1024 * 1024,
  'image/webp': 8 * 1024 * 1024,
  'application/pdf': 5 * 1024 * 1024,
};

// Piso de sanidade (04-09-2026, pedido do Lucas: "limite mínimo e
// máximo") - rejeita arquivo vazio/quase vazio cedo, com mensagem clara,
// em vez de deixar o `sharp` (ou o próprio provedor de armazenamento)
// falhar de um jeito confuso mais adiante no fluxo pra um arquivo
// corrompido/de poucos bytes.
export const TAMANHO_MINIMO_BYTES_PADRAO = 100;

// Chaves de `configuracoes` que sobrescrevem os padrões acima - uma só
// pra cada mime "família" (imagem cobre os 3 tipos de imagem aceitos;
// documento cobre PDF hoje, nome genérico de propósito, pro dia que
// outro tipo de documento entrar na lista fechada de TIPOS_MIME_
// PERMITIDOS não precisar de uma chave nova).
export const CHAVE_CONFIG_TAMANHO_MINIMO = 'arquivo_tamanho_minimo_bytes';
export const CHAVE_CONFIG_TAMANHO_MAXIMO_IMAGEM =
  'arquivo_tamanho_maximo_imagem_bytes';
export const CHAVE_CONFIG_TAMANHO_MAXIMO_DOCUMENTO =
  'arquivo_tamanho_maximo_documento_bytes';

// Uma imagem (jpeg/png/webp) usa a chave de imagem; o único outro tipo
// aceito hoje (PDF) usa a de documento - ver TIPOS_MIME_PERMITIDOS.
export function chaveConfigTamanhoMaximo(tipoMime: TipoMimePermitido): string {
  return tipoMime === 'application/pdf'
    ? CHAVE_CONFIG_TAMANHO_MAXIMO_DOCUMENTO
    : CHAVE_CONFIG_TAMANHO_MAXIMO_IMAGEM;
}

// Teto absoluto usado só na validação de forma do DTO de iniciar-upload
// (`@Max`, síncrono, sem acesso a banco) - existe só pra rejeitar valores
// absurdos (ex.: alguém mandando "tamanhoBytes": 999999999999) antes de
// qualquer lógica de negócio rodar. O teto de VERDADE, por tipo, é lido
// de `configuracoes` no service (ver arquivo.service.iniciar-upload.ts) -
// por isso este aqui É FIXO e propositalmente bem mais folgado que
// qualquer TAMANHO_MAXIMO_BYTES_POR_MIME_PADRAO: se um admin configurar
// um teto MAIOR que o padrão pelo Painel Admin, a validação do DTO não
// pode ser o que barra isso antes mesmo do service conferir o valor de
// configuracoes de verdade.
export const TAMANHO_MAXIMO_BYTES_ABSOLUTO = 100 * 1024 * 1024;

// Bytes suficientes pra conferir a assinatura mágica de todos os 4 tipos
// aceitos (o maior precisa de 12, WebP) - ver arquivo.assinatura.util.ts.
export const QUANTIDADE_BYTES_ASSINATURA = 16;

// Cota de armazenamento por usuário (01-09-2026) - nenhum teto POR
// ARQUIVO protege contra alguém subindo mil arquivos pequenos. Numa
// base de 1GB total (Supabase Storage grátis), isso deixa de ser
// preciosismo: 20 contas maliciosas em 50MB cada já tomam a cota
// inteira. Somado contra `arquivo.tamanho_bytes` (coluna
// `id_usuario_upload`, ver arquivo.service.confirmar-upload.ts).
// DEFAULT (configurável via `configuracoes`, ver comentário do teto de
// tamanho acima - mesmo motivo, mesma data de virar configurável).
export const COTA_BYTES_POR_USUARIO_PADRAO = 50 * 1024 * 1024;
export const CHAVE_CONFIG_COTA_BYTES_POR_USUARIO =
  'arquivo_cota_bytes_por_usuario';

// Rate limit de upload (04-09-2026, pedido do Lucas: "a quantidade de
// upload por usuário, e o tempo de respiro entre um upload e outro") -
// duas proteções complementares, mesmo espírito de `limite_tentativas_
// login`/`bloqueio_login_minutos` (item [03-O] do banco) e `limite_
// denuncias_24h`:
// 1. Quantidade máxima de uploads CONFIRMADOS dentro de uma janela de
//    tempo (evita um usuário legítimo mas descuidado, ou um script,
//    enchendo a conta de arquivos rápido demais - complementar à cota
//    de bytes, que sozinha não impede MUITOS arquivos pequenos).
// 2. Intervalo mínimo entre um upload confirmado e o próximo início de
//    upload - barra rajada (ex.: um script chamando iniciar-upload em
//    loop), sem incomodar o uso humano normal (uma pessoa never sobe
//    dois arquivos com menos de alguns segundos de diferença).
// Os dois são checados em iniciar-upload.ts, contra `arquivo.criado_em`
// (coluna que já existia, nenhuma migração de schema precisou disso).
export const LIMITE_UPLOADS_JANELA_PADRAO = 20;
export const JANELA_LIMITE_UPLOADS_MINUTOS_PADRAO = 24 * 60;
export const INTERVALO_MINIMO_SEGUNDOS_PADRAO = 5;

export const CHAVE_CONFIG_LIMITE_UPLOADS_JANELA =
  'arquivo_limite_uploads_janela';
export const CHAVE_CONFIG_JANELA_LIMITE_UPLOADS_MINUTOS =
  'arquivo_janela_limite_uploads_minutos';
export const CHAVE_CONFIG_INTERVALO_MINIMO_SEGUNDOS =
  'arquivo_intervalo_minimo_segundos';

// Contextos de upload (01-09-2026) - cada um usa um teto de
// redimensionamento/qualidade diferente em confirmar-upload.ts, porque
// nenhuma tela do sistema mostra avatar maior que uns 96-128px de verdade
// (512px já é folga generosa pra tela retina) enquanto uma capa de
// campanha em destaque pode ocupar a largura inteira de um monitor
// comum. Lista FECHADA de propósito, mesmo espírito de
// TIPOS_MIME_PERMITIDOS - um contexto novo precisa de decisão de
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
