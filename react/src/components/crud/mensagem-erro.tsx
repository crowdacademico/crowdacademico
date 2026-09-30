// Texto de erro em destaque no topo de um formulário ou modal (o que `useErroToast` guarda em `erro`). Vazio,
// não desenha nada. O `ModalFicha` já o mostra sozinho pela prop `erro`; usar direto só fora de modal ou quando
// o erro precisa ficar em outro ponto da tela (`className` troca o estilo padrão).
//
// `role="alert"`: numa tela que mostra o próprio erro, o aviso flutuante não aparece (useErroToast, `mostraTexto`),
// então é este texto que o leitor de tela anuncia. `data-mensagem-erro`: o useErroToast rola a tela até ele.
export function MensagemErro({
  texto,
  className = 'texto-erro text-sm font-bold text-center',
}: {
  texto?: string | null;
  className?: string;
}) {
  if (!texto) return null;
  return (
    <p role="alert" data-mensagem-erro className={className}>
      {texto}
    </p>
  );
}
