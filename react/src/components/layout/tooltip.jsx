// Ícone pequeno (ⓘ) que mostra `texto` ao passar o mouse (ou focar via
// teclado, `tabIndex`) - pedido do Lucas pra explicar coisas não óbvias
// direto na tela (ex.: por que um papel não aparece na matriz, por que um
// botão está desativado), sem precisar de um parágrafo fixo ocupando espaço
// o tempo todo. CSS puro (:hover/:focus em 2-componentes.css), sem estado
// de React - não precisa fechar ao clicar fora nem nada parecido.
// `baixo`: abre a dica PARA BAIXO em vez de para cima (padrão) - usar
// quando o ícone fica perto do topo de um cartão com `overflow-hidden`
// (ex.: cabeçalho de grupo), senão a dica nasce cortada pela borda
// arredondada do cartão, que corta qualquer coisa acima do ícone.
//
// `aoClicar` (04-09-2026, achado do Lucas: explicação grande demais pra
// caber num tooltip) - quando passado, o ícone vira um `<button>`
// clicável (cursor de ponteiro, não de "?"), o hover continua mostrando
// só `texto` (ex.: "Saiba mais", curto de propósito), e o clique dispara
// `aoClicar` - normalmente para abrir um `ModalDetalhe` com a explicação
// de verdade, organizada em parágrafos/seções.
export function Tooltip({ texto, baixo = false, aoClicar }) {
  const classe =
    'tooltip' + (baixo ? ' tooltip--baixo' : '') + (aoClicar ? ' tooltip--clicavel' : '');
  const Elemento = aoClicar ? 'button' : 'span';

  return (
    <Elemento
      type={aoClicar ? 'button' : undefined}
      className={classe}
      tabIndex={aoClicar ? undefined : 0}
      onClick={aoClicar}
    >
      <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
      <span className="tooltip__texto" role="tooltip">
        {texto}
      </span>
    </Elemento>
  );
}
