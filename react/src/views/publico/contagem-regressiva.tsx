import { useEffect, useRef, useState } from 'react';

// RF-061: a campanha "Em breve" mostra a contagem regressiva até o início. Dias e horas; no último dia, horas e
// minutos. Atualiza a cada segundo só na última hora (antes disso, a cada 30 s: o número que aparece não muda mais
// rápido que isso). Ao chegar a zero, chama `aoComecar` uma vez (a página recarrega a campanha, que passa a aceitar
// apoios). role="timer" não anuncia cada mudança ao leitor de tela (aria-live implícito "off"); o texto inteiro fica
// legível quando a pessoa chega nele.

function partes(ms: number) {
  const totalMinutos = Math.max(0, Math.floor(ms / 60_000));
  return {
    dias: Math.floor(totalMinutos / 1440),
    horas: Math.floor((totalMinutos % 1440) / 60),
    minutos: totalMinutos % 60,
    segundos: Math.max(0, Math.floor(ms / 1000) % 60),
  };
}

const plural = (n: number, singular: string, pluralTexto: string) => `${n} ${n === 1 ? singular : pluralTexto}`;

function textoContagem(ms: number): string {
  const { dias, horas, minutos, segundos } = partes(ms);
  if (dias > 0) return `${plural(dias, 'dia', 'dias')} e ${plural(horas, 'hora', 'horas')}`;
  if (horas > 0) return `${plural(horas, 'hora', 'horas')} e ${plural(minutos, 'minuto', 'minutos')}`;
  if (minutos > 0) return `${plural(minutos, 'minuto', 'minutos')} e ${plural(segundos, 'segundo', 'segundos')}`;
  return plural(segundos, 'segundo', 'segundos');
}

export function ContagemRegressiva({ inicio, aoComecar }: { inicio: string; aoComecar: () => void }) {
  const alvo = Date.parse(inicio);
  const [agora, setAgora] = useState(() => Date.now());
  const avisou = useRef(false);
  const restante = alvo - agora;

  useEffect(() => {
    if (!Number.isFinite(alvo)) return;
    if (restante <= 0) {
      if (!avisou.current) {
        avisou.current = true;
        aoComecar();
      }
      return;
    }
    const passo = restante <= 3_600_000 ? 1000 : 30_000;
    const id = window.setTimeout(() => setAgora(Date.now()), Math.min(passo, restante));
    return () => window.clearTimeout(id);
  }, [agora, alvo, restante, aoComecar]);

  if (!Number.isFinite(alvo)) return null;
  const { dias, horas, minutos } = partes(restante);
  const ultimoDia = dias === 0;
  const blocos = ultimoDia
    ? [
        { valor: horas, rotulo: horas === 1 ? 'hora' : 'horas' },
        { valor: minutos, rotulo: minutos === 1 ? 'minuto' : 'minutos' },
      ]
    : [
        { valor: dias, rotulo: dias === 1 ? 'dia' : 'dias' },
        { valor: horas, rotulo: horas === 1 ? 'hora' : 'horas' },
      ];

  return (
    <div className="rounded-xl border borda-padrao fundo-sutil p-4 mb-6" role="timer" aria-label={`A captação começa em ${textoContagem(restante)}`}>
      <p className="rotulo texto-forte mb-3">
        <i className="fa-regular fa-clock mr-2" aria-hidden="true" />
        A captação começa em
      </p>
      <div className="flex gap-3" aria-hidden="true">
        {blocos.map((bloco) => (
          <div key={bloco.rotulo} className="fundo-cartao border borda-padrao rounded-lg px-4 py-2 text-center min-w-[4.5rem]">
            <div className="numero text-2xl font-bold texto-forte">{bloco.valor}</div>
            <div className="microrrotulo texto-fraco">{bloco.rotulo}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
