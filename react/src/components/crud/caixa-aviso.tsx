import type { ReactNode } from 'react';

const CLASSE_TOM = {
  aviso: 'fundo-aviso texto-aviso',
  erro: 'fundo-erro texto-erro',
};

interface CaixaAvisoProps {
  titulo: ReactNode;
  // 'aviso' (amarelo): atenção, explica uma consequência. 'erro' (vermelho): algo sem volta ou bloqueado.
  tom?: keyof typeof CLASSE_TOM;
  icone?: string;
  // Mais espaço entre os blocos do conteúdo (caixa com vários parágrafos, lista ou botão dentro).
  espacado?: boolean;
  children?: ReactNode;
}

// Caixa colorida de "o que acontece de verdade" / "não dá para fazer isto": título em negrito com ícone e o
// texto explicativo embaixo.
export function CaixaAviso({ titulo, tom = 'aviso', icone = 'fa-circle-info', espacado = false, children }: CaixaAvisoProps) {
  return (
    <div className={`rounded-lg border borda-forte p-4 text-sm ${CLASSE_TOM[tom]} ${espacado ? 'space-y-3' : 'space-y-1'}`}>
      <p className="font-bold">
        <i className={`fa-solid ${icone} mr-1`}></i> {titulo}
      </p>
      {children}
    </div>
  );
}
