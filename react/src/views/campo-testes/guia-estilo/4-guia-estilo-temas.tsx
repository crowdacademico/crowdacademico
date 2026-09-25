import type { CSSProperties, ReactNode } from 'react';

// Os dois temas lado a lado na mesma tela. `data-tema-local` é lido pelos
// blocos de tokens de 1-cores.css (mesmos valores do tema global, sem cópia),
// então tudo que vive dentro do painel usa as cores daquele tema, qualquer que
// seja o tema escolhido no cabeçalho.
export type TemaLocal = 'claro' | 'escuro';

const TEMAS_LOCAIS: { tema: TemaLocal; titulo: string }[] = [
  { tema: 'claro', titulo: 'Tema claro' },
  { tema: 'escuro', titulo: 'Tema escuro' },
];

interface PainelTemaProps {
  tema: TemaLocal;
  titulo: string;
  // Sobrescreve tokens SÓ neste painel (a prévia do verde do texto escuro); não muda o sistema.
  estilo?: CSSProperties;
  children: ReactNode;
}

export function PainelTema({ tema, titulo, estilo, children }: PainelTemaProps) {
  return (
    <section data-tema-local={tema} style={estilo} className="fundo-pagina texto-padrao rounded-xl border borda-padrao p-4 min-w-0">
      <p className="titulo-bloco mb-3">{titulo}</p>
      {children}
    </section>
  );
}

// Renderiza os mesmos filhos uma vez por tema. `verdePrevia` (hex) troca --cor-texto-marca só no painel escuro.
export function ComparativoTemas({ children, verdePrevia }: { children: ReactNode; verdePrevia?: string | null }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {TEMAS_LOCAIS.map(({ tema, titulo }) => (
        <PainelTema
          key={tema}
          tema={tema}
          titulo={titulo}
          estilo={tema === 'escuro' && verdePrevia ? ({ '--cor-texto-marca': verdePrevia } as CSSProperties) : undefined}
        >
          {children}
        </PainelTema>
      ))}
    </div>
  );
}
