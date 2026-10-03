import type { ReactNode } from 'react';

// Caixa que rola a tabela de lado em tela estreita. Com nome e foco de teclado: uma tabela só de leitura (sem
// botão dentro) não teria como ser rolada por quem não usa mouse (WCAG 2.1.1, regra scrollable-region-focusable
// do axe).
export function CaixaTabela({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="crud-tabela__wrapper" role="region" aria-label={rotulo} tabIndex={0}>
      {children}
    </div>
  );
}
