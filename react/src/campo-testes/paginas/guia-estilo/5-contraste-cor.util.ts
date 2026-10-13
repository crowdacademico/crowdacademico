// Contraste WCAG medido NO NAVEGADOR, sobre a cor que ele realmente renderiza
// (só usado pelo Guia de Estilo, Campo de Testes). O `npm run contraste`
// (react/scripts) lê o CSS no Node e não enxerga `color-mix()` nem cor
// composta; aqui o navegador já resolveu tudo, então não há "não medido".

export type Rgba = [number, number, number, number];

export const LIMITE_TEXTO_AA = 4.5;

let contexto: CanvasRenderingContext2D | null = null;

// Normaliza qualquer cor CSS que o navegador entenda (rgb, rgba, hex,
// `color(srgb ...)` de color-mix) para [r, g, b, alfa 0 a 1], pintando 1 pixel.
export function lerCor(cor: string): Rgba {
  contexto ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!contexto) {
    return [0, 0, 0, 1];
  }
  contexto.clearRect(0, 0, 1, 1);
  contexto.fillStyle = cor;
  contexto.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = contexto.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}

// Cor com transparência (ex.: `rgba(16, 185, 129, 0.16)`) vira a cor opaca que o
// olho vê depois de colocada sobre `fundo`.
export function comporSobre(frente: Rgba, fundo: Rgba): [number, number, number] {
  const alfa = frente[3];
  return [0, 1, 2].map((i) => Math.round(frente[i] * alfa + fundo[i] * (1 - alfa))) as [number, number, number];
}

function luminancia([r, g, b]: [number, number, number]): number {
  const [R, G, B] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function razaoContraste(a: [number, number, number], b: [number, number, number]): number {
  const [x, y] = [luminancia(a), luminancia(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function paraHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
