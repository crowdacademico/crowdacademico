interface BotaoMostrarSenhaProps {
  mostrando: boolean;
  aoAlternar: () => void;
}

// O olho dentro da caixa de senha (que precisa de `relative` e `pr-10`): mostra ou oculta o que foi digitado. O
// estado fica em quem usa, porque o mesmo olho vale também para a caixa "Confirmar senha".
export function BotaoMostrarSenha({ mostrando, aoAlternar }: BotaoMostrarSenhaProps) {
  return (
    <button
      type="button"
      onClick={aoAlternar}
      aria-label={mostrando ? 'Ocultar senha' : 'Mostrar senha'}
      className="absolute right-3 top-1/2 -translate-y-1/2 texto-fraco hover-texto-forte"
    >
      <i className={'fa-solid ' + (mostrando ? 'fa-eye-slash' : 'fa-eye')} aria-hidden="true"></i>
    </button>
  );
}
