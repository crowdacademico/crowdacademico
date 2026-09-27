// Texto de erro em destaque no topo de um formulário ou modal (o que `useErroToast` guarda em `erro`). Vazio,
// não desenha nada. O `ModalFicha` já o mostra sozinho pela prop `erro`; usar direto só fora de modal ou quando
// o erro precisa ficar em outro ponto da tela.
export function MensagemErro({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return <p className="texto-erro text-sm font-bold text-center">{texto}</p>;
}
