import { useEffect } from 'react';
import type { RefObject } from 'react';

// Dropdown/faceta/combobox que fecha ao clicar fora dele (usado por sino-atividade.tsx, menu-usuario.tsx,
// generic-table.tsx, bancada-pesquisador.tsx, bancada-campanha.tsx, vida-campanha-ativa.tsx). Mesmo padrão em
// todos: listener de `mousedown` no documento (não `click`, para fechar ANTES do próximo clique completar),
// comparando o alvo do clique com um container via `ref.contains()`, sem depender de foco (funciona clicando em
// qualquer coisa não-focável também, ex.: texto dentro de um <label>).
//
// `aberto`/`aoFechar` genéricos de propósito: não é sempre um `boolean` (GenericTable usa uma CHAVE de faceta,
// `string | null`, não um booleano); o chamador decide a condição `aberto` e a ação `aoFechar` de acordo com o
// próprio estado, o hook não precisa saber a forma exata.
//
// Deps do efeito são só `[aberto]`, de propósito: `ref`/callback de fechar são sempre um `useRef`/`setState`
// estáveis nos casos reais. Um `aoFechar` recriado a cada render (ex.: `() => setX(false)` inline) não recria a
// inscrição do listener a cada render, só quando `aberto` muda de verdade.
export function useFecharAoClicarFora(
  ref: RefObject<HTMLElement | null>,
  aberto: boolean,
  aoFechar: () => void,
): void {
  useEffect(() => {
    if (!aberto) return undefined;
    const aoClicarFora = (evento: MouseEvent) => {
      if (ref.current && evento.target instanceof Node && !ref.current.contains(evento.target)) {
        aoFechar();
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);
}
