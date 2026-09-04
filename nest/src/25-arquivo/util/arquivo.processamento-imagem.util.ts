import sharp from 'sharp';
import {
  ContextoArquivo,
  PERFIL_PROCESSAMENTO_POR_CONTEXTO,
} from '../arquivo.constants';

// Roda em confirmar-upload.ts, DEPOIS da assinatura já ter sido conferida
// (nunca processar bytes que ainda não foram validados como o tipo que
// afirmam ser). Três coisas na mesma passada, sempre nesta ordem (decisão
// Lucas + Claude Web + Claude Code, 01-09-2026):
//
// 1. `.rotate()` sem argumento - auto-orienta pela EXIF ANTES de mexer em
//    mais nada. Foto de celular em retrato quase sempre grava os pixels
//    "deitados" e conta com o leitor aplicar a orientação da EXIF na hora
//    de exibir; se a gente descartasse a EXIF (passo 3) sem antes gravar
//    a rotação nos pixels de verdade, a foto sairia de lado pra sempre.
// 2. `.resize()` pro teto do contexto (avatar/campanha/atualização) - o
//    corte de tamanho maior de todos, ver PERFIL_PROCESSAMENTO_POR_CONTEXTO.
//    `withoutEnlargement` pra nunca ESTICAR uma imagem menor que o teto
//    (upar uma imagem 300px não devia virar 512px borrado).
// 3. `.webp({ quality })` - 25-35% menor que JPEG na mesma qualidade
//    visual. sharp não preserva metadado a menos que `.withMetadata()`
//    seja chamado explicitamente, então a EXIF (localização, modelo do
//    aparelho) já sai removida como efeito colateral gratuito do passo 2.
//
// PDF nunca passa por aqui - sharp só lida com imagem, ver comentário em
// confirmar-upload.ts sobre o teto separado de 5MB pra PDF.
export async function processarImagem(
  bytesOriginais: Buffer,
  contexto: ContextoArquivo,
): Promise<Buffer> {
  const perfil = PERFIL_PROCESSAMENTO_POR_CONTEXTO[contexto];

  return sharp(bytesOriginais)
    .rotate()
    .resize({
      width: perfil.larguraMaxima,
      withoutEnlargement: true,
    })
    .webp({ quality: perfil.qualidadeWebp })
    .toBuffer();
}
