import { useEffect, useState } from 'react';
import { Dica } from '../tooltip';

const CHAVE_LOCALSTORAGE = 'crowdacademico.escalaFonte';
const ESCALA_PADRAO = 1;
const ESCALA_MINIMA = 0.875;
const ESCALA_MAXIMA = 1.25;
const PASSO = 0.125;

function lerEscalaSalva(): number {
  const salva = Number(localStorage.getItem(CHAVE_LOCALSTORAGE));
  return salva && salva >= ESCALA_MINIMA && salva <= ESCALA_MAXIMA ? salva : ESCALA_PADRAO;
}

// Botão A-/A+ no cabeçalho (acessibilidade: aumentar e diminuir fonte). Muda --escala-fonte (3-base.css,
// aplicada no html inteiro) e guarda a escolha em localStorage: persiste entre sessões, mesmo padrão de
// CHAVE_REFRESH_TOKEN em use-auth. Estado inicial já lê o valor salvo (useState(lerEscalaSalva), não um
// useEffect que chama setState depois): evita o flash de "voltou para o tamanho padrão" que aconteceria se a
// leitura ficasse para depois do primeiro render.
//
// Preferência de DISPOSITIVO via localStorage, não por conta: preferência pessoal por conta deveria ficar numa
// tabela própria se um dia existir, e não em colunas soltas em `usuario` (o projeto já tem tabelas demais).
export function ControleFonte() {
  const [escala, setEscala] = useState(lerEscalaSalva);

  useEffect(() => {
    document.documentElement.style.setProperty('--escala-fonte', String(escala));
    localStorage.setItem(CHAVE_LOCALSTORAGE, String(escala));
  }, [escala]);

  const mudar = (delta: number) => {
    setEscala((atual) =>
      Number(Math.min(ESCALA_MAXIMA, Math.max(ESCALA_MINIMA, atual + delta)).toFixed(3)),
    );
  };

  return (
    <div
      className="flex items-center border borda-forte rounded-lg overflow-hidden"
      role="group"
      aria-label="Tamanho da fonte"
    >
      <button
        type="button"
        onClick={() => mudar(-PASSO)}
        disabled={escala <= ESCALA_MINIMA}
        aria-label="Diminuir fonte"
        className="dica px-2.5 py-1.5 text-xs font-bold texto-padrao hover-fundo-sutil transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        A-
        <Dica texto="Diminuir fonte" curta baixo />
      </button>
      <button
        type="button"
        onClick={() => mudar(PASSO)}
        disabled={escala >= ESCALA_MAXIMA}
        aria-label="Aumentar fonte"
        className="dica px-2.5 py-1.5 text-xs font-bold texto-padrao hover-fundo-sutil transition-colors border-l borda-forte disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        A+
        <Dica texto="Aumentar fonte" curta baixo />
      </button>
    </div>
  );
}
