// Botão que mostra e esconde um painel logo abaixo dele (Ver log, Registro de Chamadas): a mesma aparência em toda
// tela, com a setinha dizendo se o painel está aberto e, quando houver, quantos itens ele tem.
export function BotaoMostrarEsconder({
  aberto,
  aoAlternar,
  rotulo,
  contador,
  className = '',
}: {
  aberto: boolean;
  aoAlternar: () => void;
  rotulo: string;
  contador?: number;
  className?: string;
}) {
  return (
    <button type="button" aria-expanded={aberto} onClick={aoAlternar} className={'btn btn-secondary ' + className}>
      <i className={`fa-solid fa-chevron-${aberto ? 'down' : 'right'}`} aria-hidden="true"></i>
      {aberto ? 'Esconder' : 'Ver'} {rotulo}
      {contador !== undefined && ` (${contador})`}
    </button>
  );
}
