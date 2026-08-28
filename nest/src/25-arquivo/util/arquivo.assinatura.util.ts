import { TipoMimePermitido } from '../arquivo.constants';

// O tipo que o navegador declara (Content-Type do PUT, ou o campo
// tipoMime que o cliente manda pro Nest) é uma AFIRMAÇÃO, não um fato —
// alguém pode renomear virus.exe pra foto.jpg e o navegador aceita
// tranquilamente. A única forma confiável de saber o que subiu de
// verdade é ler os primeiros bytes do objeto e conferir a assinatura
// (magic number) de cada formato — todo JPEG/PNG/PDF começa com uma
// sequência fixa e conhecida; WebP começa com um contêiner RIFF. Ver doc
// de arquitetura, seção "Validação: o navegador mente".
//
// Usado só em arquivo.service.confirmar-upload.ts, DEPOIS que o arquivo
// já está no bucket (pendente/) — é o único momento em que dá pra ler os
// bytes de verdade.
export function assinaturaCorrespondeAoTipo(
  bytes: Buffer,
  tipoMime: TipoMimePermitido,
): boolean {
  switch (tipoMime) {
    case 'image/jpeg':
      // FF D8 FF — todo JPEG começa assim (marcador SOI seguido do
      // primeiro marcador de segmento).
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

    case 'image/png':
      // 89 50 4E 47 0D 0A 1A 0A — assinatura fixa de 8 bytes do formato PNG.
      return (
        bytes.length >= 8 &&
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47 &&
        bytes[4] === 0x0d &&
        bytes[5] === 0x0a &&
        bytes[6] === 0x1a &&
        bytes[7] === 0x0a
      );

    case 'image/webp':
      // Contêiner RIFF: 4 bytes "RIFF", 4 bytes de tamanho (variam,
      // ignorados), 4 bytes "WEBP".
      return (
        bytes.length >= 12 &&
        bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
        bytes.subarray(8, 12).toString('ascii') === 'WEBP'
      );

    case 'application/pdf':
      // "%PDF-" — todo PDF começa com isso (a versão vem logo depois,
      // ex. "%PDF-1.7").
      return (
        bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-'
      );

    default:
      return false;
  }
}
