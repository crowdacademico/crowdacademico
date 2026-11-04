// Texto das ações (Alterar, Excluir...): some quando a tabela não cabe com ele (`data-acoes-icone` na caixa, 5-crud.css,
// deixa só o ícone) e volta quando a caixa tiver de novo a largura que a tabela pedia com o texto. Usado pela
// GenericTable e pela CaixaTabela das tabelas pequenas; quem chama roda a função devolvida a cada mudança de tamanho.
export function criarAjusteTextoAcoes(caixa: HTMLElement): () => void {
  let larguraComTexto = 0;
  return () => {
    if (!caixa.hasAttribute('data-acoes-icone')) {
      if (caixa.scrollWidth > caixa.clientWidth) {
        larguraComTexto = caixa.scrollWidth;
        caixa.setAttribute('data-acoes-icone', '');
      }
    } else if (caixa.clientWidth >= larguraComTexto) {
      caixa.removeAttribute('data-acoes-icone');
    }
  };
}
