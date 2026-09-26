import { useEffect, useState } from 'react';
import { Dica } from '../tooltip';

type Tema = 'claro' | 'escuro' | 'sistema';

const CHAVE_LOCALSTORAGE = 'crowdacademico.tema';
const TEMAS: Tema[] = ['claro', 'escuro', 'sistema'];
const CONFIG_TEMA: Record<Tema, { icone: string; rotulo: string }> = {
  claro: { icone: 'fa-sun', rotulo: 'Tema claro (clique pra escuro)' },
  escuro: { icone: 'fa-moon', rotulo: 'Tema escuro (clique pra seguir o sistema)' },
  sistema: { icone: 'fa-circle-half-stroke', rotulo: 'Seguindo o tema do sistema (clique pro claro)' },
};

// Guarda de tipo em vez de `TEMAS.includes(salvo)` direto: `salvo` vem de
// localStorage como `string | null`, e `Array<Tema>.includes` não aceita
// um `string` solto como argumento - comparar campo a campo prova pro
// TypeScript que o retorno é `Tema` sem precisar de `as`.
function ehTema(valor: string | null): valor is Tema {
  return valor === 'claro' || valor === 'escuro' || valor === 'sistema';
}

function lerTemaSalvo(): Tema {
  const salvo = localStorage.getItem(CHAVE_LOCALSTORAGE);
  return ehTema(salvo) ? salvo : 'claro';
}

// Botão de tema no cabeçalho: mesmo padrão do ControleFonte (useState(lerTemaSalvo) como inicializador
// preguiçoso, que evita flash do tema errado no primeiro render, + useEffect que aplica e persiste). A
// diferença é ONDE aplica: data-tema-efetivo é um ATRIBUTO em <html>, não uma custom property: 1-cores.css tem
// 2 blocos de tokens (:root = claro, :root[data-tema-efetivo='escuro']) que reagem a esse atributo sozinhos, e
// nenhum componente além deste precisa saber que o tema mudou. "sistema" é resolvido AQUI (matchMedia) para
// claro ou escuro, e acompanha a mudança do sistema operacional; o CSS não conhece "sistema". Ciclo claro →
// escuro → sistema → claro.
//
// Preferência de DISPOSITIVO via localStorage, não por conta (mesmo motivo do ControleFonte).
export function ControleTema() {
  const [tema, setTema] = useState(lerTemaSalvo);

  useEffect(() => {
    const raiz = document.documentElement;
    const sistemaEscuro = window.matchMedia('(prefers-color-scheme: dark)');
    const aplicar = () => {
      raiz.dataset.temaEfetivo = tema === 'sistema' ? (sistemaEscuro.matches ? 'escuro' : 'claro') : tema;
    };
    raiz.dataset.tema = tema;
    localStorage.setItem(CHAVE_LOCALSTORAGE, tema);
    aplicar();
    if (tema !== 'sistema') {
      return;
    }
    sistemaEscuro.addEventListener('change', aplicar);
    return () => sistemaEscuro.removeEventListener('change', aplicar);
  }, [tema]);

  const proximoTema = () => {
    const indiceAtual = TEMAS.indexOf(tema);
    setTema(TEMAS[(indiceAtual + 1) % TEMAS.length]);
  };

  const { icone, rotulo } = CONFIG_TEMA[tema];

  return (
    <button
      type="button"
      onClick={proximoTema}
      aria-label={rotulo}
      className="dica flex items-center justify-center w-9 h-9 borda-padrao border rounded-lg texto-padrao hover-fundo-sutil transition-colors"
    >
      <i className={'fa-solid ' + icone}></i>
      <Dica texto={rotulo} curta baixo />
    </button>
  );
}
