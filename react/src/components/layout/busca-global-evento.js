// Separado de busca-global.jsx de propósito (mesmo motivo de toast-context.js
// estar separado de toast-provider.jsx) — um arquivo que só exporta
// componente React não pode exportar mais nada junto sem quebrar o Fast
// Refresh (react-refresh/only-export-components).
export const EVENTO_ABRIR_BUSCA_GLOBAL = 'busca-global:abrir';

// Usado por admin-sidebar.jsx pro botão visível "Buscar" — Ctrl+K sozinho
// não é descobrível pra quem não sabe que existe.
export function abrirBuscaGlobal() {
  window.dispatchEvent(new Event(EVENTO_ABRIR_BUSCA_GLOBAL));
}
