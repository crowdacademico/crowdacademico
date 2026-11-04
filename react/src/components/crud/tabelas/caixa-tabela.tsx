import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { criarAjusteTextoAcoes } from '../colunas/texto-acoes';

// Caixa que rola a tabela de lado em tela estreita. Com nome e foco de teclado: uma tabela só de leitura (sem
// botão dentro) não teria como ser rolada por quem não usa mouse (WCAG 2.1.1, regra scrollable-region-focusable
// do axe). Como na GenericTable, as ações ficam só com o ícone quando a tabela não cabe com o texto delas.
export function CaixaTabela({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = caixa.current;
    if (!elemento) return;
    const ajustar = criarAjusteTextoAcoes(elemento);
    const observador = new ResizeObserver(ajustar);
    observador.observe(elemento);
    if (elemento.firstElementChild) observador.observe(elemento.firstElementChild);
    ajustar();
    return () => observador.disconnect();
  }, []);

  return (
    <div ref={caixa} className="crud-tabela__wrapper" role="region" aria-label={rotulo} tabIndex={0}>
      {children}
    </div>
  );
}
