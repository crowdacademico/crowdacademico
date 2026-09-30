interface BarraProgressoProps {
  valor: number;
  total: number;
  // O que a barra mede, para leitor de tela (ex.: "Arrecadado em relação à meta").
  rotulo: string;
}

// Barra de quanto de um total já foi atingido, com a porcentagem ao lado. Passou de 100%: a barra fica cheia e a
// porcentagem continua mostrando o valor real (ex.: 105%). Largura fixa (CSS), para caber numa coluna curta da
// GenericTable sem entrar na medição de largura dela.
export function BarraProgresso({ valor, total, rotulo }: BarraProgressoProps) {
  const porcentagem = total > 0 ? Math.round((valor / total) * 100) : 0;
  const preenchido = Math.min(100, Math.max(0, porcentagem));
  return (
    <span className="barra-progresso">
      <span
        className={'barra-progresso__trilho' + (porcentagem >= 100 ? ' barra-progresso__trilho--completo' : '')}
        role="progressbar"
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={preenchido}
        aria-valuetext={`${porcentagem}%`}
      >
        <span className="barra-progresso__preenchido" style={{ width: `${preenchido}%` }}></span>
      </span>
      <span className="barra-progresso__porcentagem">{porcentagem}%</span>
    </span>
  );
}
