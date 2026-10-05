import { useLayoutEffect, useRef, useState } from 'react';
import type { TamanhoPagina } from '../pagination/tamanhos-pagina.constants';

// Quantas linhas vazias completam a última página: só com mais de uma página (lista curta não ganha linha vazia) e
// nunca em "todos".
export function quantasLinhasVazias(totalPaginas: number, tamanhoPagina: TamanhoPagina, naPagina: number): number {
  return totalPaginas > 1 && tamanhoPagina !== 'todos' ? Math.max(0, tamanhoPagina - naPagina) : 0;
}

// Altura das linhas vazias, medida numa linha de verdade da tabela (pílula e botões de ação deixam a linha mais alta
// que uma linha só de texto). As bordas mudam meio pixel por linha: a 1ª encosta na linha grossa do cabeçalho (fica
// mais alta) e a última não tem borda embaixo (fica mais baixa). Por isso o modelo é uma linha do meio; com um
// registro só, desconta da 1ª a diferença da borda do cabeçalho; e a última vazia desconta a borda que não tem.
// `medirDeNovo` muda quando as linhas da página mudam.
export function useLinhasVazias(medirDeNovo: unknown, quantas: number) {
  const corpoRef = useRef<HTMLTableSectionElement>(null);
  const [medida, setMedida] = useState<{ altura: number; borda: number } | null>(null);

  useLayoutEffect(() => {
    const corpo = corpoRef.current;
    const reais = [...(corpo?.querySelectorAll('tr:not(.crud-tabela__linha-vazia)') ?? [])];
    const primeira = reais.at(0);
    if (!corpo || !primeira) return;
    // A linha fina entre as linhas mora na própria linha (tr), não na célula (5-crud.css).
    const borda = parseFloat(getComputedStyle(primeira).borderBottomWidth) || 0;
    const cabecalho = corpo.parentElement?.querySelector('thead th');
    const bordaCabecalho = cabecalho ? parseFloat(getComputedStyle(cabecalho).borderBottomWidth) || 0 : borda;
    const altura =
      reais.length >= 2
        ? reais[1].getBoundingClientRect().height
        : primeira.getBoundingClientRect().height - (bordaCabecalho - borda) / 2;
    // Só grava se a medida mudou: gravar sempre um objeto novo redesenhava a tabela sem parar.
    setMedida((atual) => (atual?.altura === altura && atual.borda === borda ? atual : { altura, borda }));
  }, [medirDeNovo]);

  const alturaDa = (indice: number): number | undefined =>
    medida ? (indice === quantas - 1 ? medida.altura - medida.borda / 2 : medida.altura) : undefined;

  return { corpoRef, alturaDa };
}
