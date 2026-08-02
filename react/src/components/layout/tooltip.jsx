// Ícone pequeno (ⓘ) que mostra `texto` ao passar o mouse (ou focar via
// teclado, `tabIndex`) — pedido do Lucas pra explicar coisas não óbvias
// direto na tela (ex.: por que um papel não aparece na matriz, por que um
// botão está desativado), sem precisar de um parágrafo fixo ocupando espaço
// o tempo todo. CSS puro (:hover/:focus em 2-componentes.css), sem estado
// de React — não precisa fechar ao clicar fora nem nada parecido.
export function Tooltip({ texto }) {
  return (
    <span className="tooltip" tabIndex={0}>
      <i className="fa-solid fa-circle-info" aria-hidden="true"></i>
      <span className="tooltip__texto" role="tooltip">
        {texto}
      </span>
    </span>
  );
}
