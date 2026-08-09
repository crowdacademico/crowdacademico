import { useEffect, useState } from 'react';

const CHAVE_LOCALSTORAGE = 'crowdacademico.tema';
const TEMAS = ['claro', 'escuro', 'sistema'];
const CONFIG_TEMA = {
  claro: { icone: 'fa-sun', rotulo: 'Tema claro (clique pra escuro)' },
  escuro: { icone: 'fa-moon', rotulo: 'Tema escuro (clique pra seguir o sistema)' },
  sistema: { icone: 'fa-circle-half-stroke', rotulo: 'Seguindo o tema do sistema (clique pro claro)' },
};

function lerTemaSalvo() {
  const salvo = localStorage.getItem(CHAVE_LOCALSTORAGE);
  return TEMAS.includes(salvo) ? salvo : 'claro';
}

// Botão de tema no cabeçalho (09-08-2026, Bloco A do prompt do Claude Web
// sobre dark mode) — mesmo padrão do ControleFonte: useState(lerTemaSalvo)
// como inicializador preguiçoso (evita flash do tema errado no primeiro
// render) + useEffect que aplica e persiste. A diferença é ONDE aplica:
// data-tema é um ATRIBUTO em <html>, não uma custom property — 1-base.css
// tem os 3 blocos de tokens (:root = claro, :root[data-tema='escuro'],
// @media(prefers-color-scheme:dark) + [data-tema='sistema']) que reagem a
// esse atributo sozinhos, nenhum componente além deste precisa saber que
// o tema mudou.
// Ciclo claro → escuro → sistema → claro (pedido explícito do Lucas).
export function ControleTema() {
  const [tema, setTema] = useState(lerTemaSalvo);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    localStorage.setItem(CHAVE_LOCALSTORAGE, tema);
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
      title={rotulo}
      className="flex items-center justify-center w-9 h-9 borda-padrao border rounded-lg texto-padrao hover-fundo-sutil transition-colors"
    >
      <i className={'fa-solid ' + icone}></i>
    </button>
  );
}
