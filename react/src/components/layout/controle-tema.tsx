import { useEffect, useState } from 'react';

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

// Botão de tema no cabeçalho (09-08-2026, Bloco A do prompt de uma IA
// sobre dark mode) - mesmo padrão do ControleFonte: useState(lerTemaSalvo)
// como inicializador preguiçoso (evita flash do tema errado no primeiro
// render) + useEffect que aplica e persiste. A diferença é ONDE aplica:
// data-tema é um ATRIBUTO em <html>, não uma custom property - 1-base.css
// tem os 3 blocos de tokens (:root = claro, :root[data-tema='escuro'],
// @media(prefers-color-scheme:dark) + [data-tema='sistema']) que reagem a
// esse atributo sozinhos, nenhum componente além deste precisa saber que
// o tema mudou.
// Ciclo claro → escuro → sistema → claro (pedido explícito do Lucas).
//
// Preferência POR CONTA - tentada em 10-08-2026 (usuario.tema_preferido no
// banco, sincronizada com auth), REVERTIDA no mesmo dia por decisão do
// Lucas com a Alexia: preferência pessoal deveria ficar numa tabela
// própria se um dia existir, não colunas soltas em `usuario` ("estamos com
// tabelas demais no momento"). Preferência de DISPOSITIVO via localStorage
// é, de novo, a única fonte - mesmo comportamento de antes dessa tentativa.
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
