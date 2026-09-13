import { useEffect } from 'react';
import type { RefObject } from 'react';

// Extraído (13-09-2026, achado de auditoria: 7 ocorrências do MESMO bloco,
// byte a byte, em 6 arquivos diferentes - sino-atividade.tsx, menu-usuario.
// tsx, generic-table.tsx, bancada-pesquisador.tsx, bancada-campanha.tsx
// (2x, facet "Status" + combobox de pesquisador), vida-campanha-ativa.tsx)
// - dropdown/faceta/combobox que fecha ao clicar fora dele. Mesmo padrão em
// todos: listener de `mousedown` no documento (não `click`, pra fechar
// ANTES do próximo clique completar - ver histórico do achado original em
// generic-table.tsx), comparando o alvo do clique com um container via
// `ref.contains()`, sem depender de foco (funciona clicando em qualquer
// coisa não-focável também, ex.: texto dentro de um <label>).
//
// `aberto`/`aoFechar` genéricos de propósito - não é sempre um `boolean`
// (GenericTable usa uma CHAVE de faceta, `string | null`, não um booleano
// - o chamador decide a condição `aberto` e a ação `aoFechar` de acordo
// com o próprio estado, o hook não precisa saber a forma exata).
//
// Deps do efeito são só `[aberto]`, de propósito - mesmo comportamento dos
// 7 originais, que nunca reagiam a mudança de referência de `ref`/callback
// de fechar (sempre um `useRef`/`setState` estáveis nos 7 casos reais).
// Um `aoFechar` recriado a cada render (ex.: `() => setX(false)` inline)
// não recria a inscrição do listener a cada render - só quando `aberto`
// muda de verdade, igual sempre foi.
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
