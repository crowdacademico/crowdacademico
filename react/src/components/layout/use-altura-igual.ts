import { useLayoutEffect, useRef } from 'react';

// Iguala a altura de um tipo de elemento dentro de um bloco de cartões (22-11-2026, Sobre): todos os títulos (`seletor`)
// ganham a altura do mais alto, então os parágrafos começam na mesma altura em todos os cartões, inclusive em linhas
// diferentes da grade, coisa que o CSS sozinho não faz (o subgrid só alinha cartões da mesma linha). A altura dos
// cartões iguala no CSS (`auto-rows-fr` na grade). Recalcula quando a largura muda (tablet, rotação), no A+/A- e quando as
// fontes terminam de carregar. Abaixo de `aPartirDe` (um cartão por linha) não iguala: sobraria espaço vazio à toa.
export function useAlturaIgual<T extends HTMLElement>(seletor: string, aPartirDe = 640) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const caixa = ref.current;
    if (!caixa) return;
    let larguraMedida = -1;

    const igualar = () => {
      const elementos = [...caixa.querySelectorAll<HTMLElement>(seletor)];
      elementos.forEach((elemento) => (elemento.style.minHeight = ''));
      if (window.innerWidth < aPartirDe) return;
      const maior = Math.max(0, ...elementos.map((elemento) => elemento.getBoundingClientRect().height));
      elementos.forEach((elemento) => (elemento.style.minHeight = `${Math.ceil(maior)}px`));
    };

    // Só a largura importa: igualar muda a altura do bloco, e reagir a isso entraria num laço.
    const observador = new ResizeObserver(([entrada]) => {
      const largura = Math.round(entrada.contentRect.width);
      if (largura === larguraMedida) return;
      larguraMedida = largura;
      igualar();
    });
    observador.observe(caixa);
    // O A+/A- (controle-fonte.tsx) muda --escala-fonte no <html>, sem mudar a largura: também reiguala.
    const fonte = new MutationObserver(igualar);
    fonte.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    void document.fonts.ready.then(igualar);
    return () => {
      observador.disconnect();
      fonte.disconnect();
    };
  }, [seletor, aPartirDe]);

  return ref;
}
