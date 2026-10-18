interface BarraProgressoProps {
  valor: number;
  total: number;
  // O que a barra mede, para leitor de tela (ex.: "Arrecadado em relação à meta").
  rotulo: string;
}

// Barra de quanto de um total já foi atingido, com a porcentagem ao lado. Passou de 100%: a barra fica cheia e a
// porcentagem continua mostrando o valor real (ex.: 105%). Largura fixa (CSS), para caber numa coluna curta da
// GenericTable sem entrar na medição de largura dela.
// Para uma célula da GenericTable: o texto fica onde sempre esteve e a barra fina vem por baixo dele, solta do
// layout (position: absolute), da mesma largura do texto: não muda a largura da coluna nem a altura da linha. A
// porcentagem fica no rótulo (leitor de tela) e na dica do mouse.
export function TextoComBarraProgresso({ texto, valor, total, rotulo }: BarraProgressoProps & { texto: string }) {
  const porcentagem = total > 0 ? Math.round((valor / total) * 100) : 0;
  const preenchido = Math.min(100, Math.max(0, porcentagem));
  return (
    <span className="barra-progresso-sob" title={`${porcentagem}% da meta`}>
      {texto}
      <span
        className={'barra-progresso-sob__trilho' + (porcentagem >= 100 ? ' barra-progresso__trilho--completo' : '')}
        role="progressbar"
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={preenchido}
        aria-valuetext={`${porcentagem}%`}
      >
        <span className="barra-progresso__preenchido" style={{ width: `${preenchido}%` }}></span>
      </span>
    </span>
  );
}

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
