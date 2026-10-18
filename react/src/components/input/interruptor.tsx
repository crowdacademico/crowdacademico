// Interruptor liga/desliga (role="switch"): o trilho com a bolinha e o texto do estado ao lado. `indisponivel` é o motivo
// de não poder mudar agora (fica apagado, com o motivo na dica do navegador). Medidas em tokens (`--interruptor-*`,
// 3-base.css) e cores do tema (4-componentes.css).
interface InterruptorProps {
  ligado: boolean;
  aoAlternar: () => void;
  // Nome acessível: o que este interruptor liga (ex.: "Rodar o repasse").
  rotulo: string;
  textoLigado?: string;
  textoDesligado?: string;
  indisponivel?: string;
  ocupado?: boolean;
}

export function Interruptor({
  ligado,
  aoAlternar,
  rotulo,
  textoLigado = 'Ligada',
  textoDesligado = 'Desligada',
  indisponivel,
  ocupado = false,
}: InterruptorProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      title={indisponivel}
      disabled={Boolean(indisponivel) || ocupado}
      onClick={aoAlternar}
      className={'interruptor' + (ligado ? ' interruptor--ligado' : '')}
    >
      <span className="interruptor__trilho" aria-hidden="true">
        <span className="interruptor__bolinha"></span>
      </span>
      <span className="interruptor__texto legenda-destaque">{ligado ? textoLigado : textoDesligado}</span>
    </button>
  );
}
