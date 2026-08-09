import { useEffect, useState } from 'react';

const CHAVE_LOCALSTORAGE = 'crowdacademico.escalaFonte';
const ESCALA_PADRAO = 1;
const ESCALA_MINIMA = 0.875;
const ESCALA_MAXIMA = 1.25;
const PASSO = 0.125;

function lerEscalaSalva() {
  const salva = Number(localStorage.getItem(CHAVE_LOCALSTORAGE));
  return salva && salva >= ESCALA_MINIMA && salva <= ESCALA_MAXIMA ? salva : ESCALA_PADRAO;
}

// Botão A-/A+ no cabeçalho (09-08-2026, pedido do Lucas: acessibilidade,
// "botão de aumentar e diminuir fonte"). Muda --escala-fonte (1-base.css,
// aplicada no html inteiro) e guarda a escolha em localStorage — persiste
// entre sessões, mesmo padrão de CHAVE_REFRESH_TOKEN em use-auth.js.
// Estado inicial já lê o valor salvo (useState(lerEscalaSalva), não um
// useEffect que chama setState depois) — evita o flash de "voltou pro
// tamanho padrão" que aconteceria se a leitura ficasse pra depois do
// primeiro render.
export function ControleFonte() {
  const [escala, setEscala] = useState(lerEscalaSalva);

  useEffect(() => {
    document.documentElement.style.setProperty('--escala-fonte', escala);
    localStorage.setItem(CHAVE_LOCALSTORAGE, String(escala));
  }, [escala]);

  const mudar = (delta) => {
    setEscala((atual) =>
      Number(Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, atual + delta)).toFixed(3)),
    );
  };

  return (
    <div
      className="flex items-center border border-slate-300 rounded-lg overflow-hidden"
      role="group"
      aria-label="Tamanho da fonte"
    >
      <button
        type="button"
        onClick={() => mudar(-PASSO)}
        disabled={escala <= ESCALA_MINIMA}
        aria-label="Diminuir fonte"
        title="Diminuir fonte"
        className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        A-
      </button>
      <button
        type="button"
        onClick={() => mudar(PASSO)}
        disabled={escala >= ESCALA_MAXIMA}
        aria-label="Aumentar fonte"
        title="Aumentar fonte"
        className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors border-l border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        A+
      </button>
    </div>
  );
}
