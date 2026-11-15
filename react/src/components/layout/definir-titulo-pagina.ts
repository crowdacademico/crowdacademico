const NOME_SITE = 'CrowdAcadêmico';

// O título da aba do navegador (WCAG 2.4.2). Fica fora de titulo-da-pagina.tsx porque arquivo de componente só exporta
// componente (Fast Refresh do Vite). Usado pelo TituloDaPagina e por páginas com nome próprio (a campanha).
export function definirTituloDaPagina(rotulo: string | null): void {
  document.title = rotulo ? `${rotulo} · ${NOME_SITE}` : NOME_SITE;
}
