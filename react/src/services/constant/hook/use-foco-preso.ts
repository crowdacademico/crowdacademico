import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

const SELETOR_FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Janelas abertas, da mais antiga para a mais nova: só a de CIMA prende o Tab (ex.: o detalhe de um item aberto
// dentro do modal de Alterar), senão as duas brigariam pelo mesmo Tab.
const pilhaDeJanelas: HTMLElement[] = [];

// Foco do teclado de uma janela (modal, busca, gaveta de menu): ao abrir, leva o foco para dentro (para a própria
// janela, que o leitor de tela anuncia pelo título, a menos que algo lá dentro já tenha foco, como o campo da
// busca); enquanto aberta, Tab e Shift+Tab circulam só lá dentro, em vez de passear pela página escondida atrás;
// ao fechar, devolve o foco para quem abriu. A janela precisa de `tabIndex={-1}` para poder receber o foco.
//
// `aoEsc`: o Esc é ouvido na página inteira e só a janela de CIMA fecha (padrão de Radix, Headless UI e MUI). Ouvir
// dentro da janela falhava quando o foco saía dela (ex.: o botão clicado sumia da tela, como "Remover foto"). Um Esc
// que um componente de dentro já tratou (lista de sugestões, por exemplo) não chega até aqui.
export function useFocoPreso(ref: RefObject<HTMLElement | null>, ativo = true, aoEsc?: () => void) {
  // Sempre a versão mais nova do `aoEsc`, sem refazer o efeito (e sem mexer na pilha) a cada desenho da tela.
  const aoEscRef = useRef(aoEsc);
  useEffect(() => {
    aoEscRef.current = aoEsc;
  });

  useEffect(() => {
    const janela = ref.current;
    if (!ativo || !janela) {
      return;
    }
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    pilhaDeJanelas.push(janela);
    if (!janela.contains(document.activeElement)) {
      janela.focus();
    }

    const focaveis = () =>
      [...janela.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS)].filter((elemento) => elemento.getClientRects().length > 0);

    const aoTeclar = (evento: KeyboardEvent) => {
      if (pilhaDeJanelas[pilhaDeJanelas.length - 1] !== janela) {
        return;
      }
      if (evento.key === 'Escape') {
        if (aoEscRef.current && !evento.defaultPrevented) {
          evento.preventDefault();
          aoEscRef.current();
        }
        return;
      }
      if (evento.key !== 'Tab') {
        return;
      }
      const lista = focaveis();
      if (lista.length === 0) {
        evento.preventDefault();
        return;
      }
      const primeiro = lista[0];
      const ultimo = lista[lista.length - 1];
      const atual = document.activeElement;
      const fora = !janela.contains(atual);
      if (evento.shiftKey && (fora || atual === primeiro || atual === janela)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && (fora || atual === ultimo)) {
        evento.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener('keydown', aoTeclar);

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      const posicao = pilhaDeJanelas.lastIndexOf(janela);
      if (posicao >= 0) {
        pilhaDeJanelas.splice(posicao, 1);
      }
      if (focoAnterior?.isConnected) {
        focoAnterior.focus();
      }
    };
  }, [ref, ativo]);
}
