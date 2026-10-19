import type { ReactNode } from 'react';

const CLASSE_TOM = {
  aviso: 'fundo-aviso texto-aviso',
  erro: 'fundo-erro texto-erro',
  info: 'fundo-info texto-info',
};

interface CaixaAvisoProps {
  titulo: ReactNode;
  // 'aviso' (amarelo): atenção, explica uma consequência. 'erro' (vermelho): algo sem volta ou bloqueado. 'info' (azul):
  // só informa o estado, nada a corrigir.
  tom?: keyof typeof CLASSE_TOM;
  icone?: string;
  // Mais espaço entre os blocos do conteúdo (caixa com vários parágrafos, lista ou botão dentro).
  espacado?: boolean;
  // Título grande (o de seção), na cor da caixa: para o aviso que não pode passar despercebido.
  tituloEmDestaque?: boolean;
  children?: ReactNode;
}

// Caixa colorida de "o que acontece de verdade" / "não dá para fazer isto": título em negrito com ícone e o
// texto explicativo embaixo.
export function CaixaAviso({
  titulo,
  tom = 'aviso',
  icone = 'fa-circle-info',
  espacado = false,
  tituloEmDestaque = false,
  children,
}: CaixaAvisoProps) {
  return (
    <div className={`rounded-lg border borda-forte p-4 paragrafo ${CLASSE_TOM[tom]} ${espacado ? 'space-y-3' : 'space-y-1'}`}>
      {tituloEmDestaque ? (
        <h2 className="titulo-secao texto-herdado">
          <i className={`fa-solid ${icone} mr-2`} aria-hidden="true"></i>
          {titulo}
        </h2>
      ) : (
        <p className="enfase">
          <i className={`fa-solid ${icone} mr-1`} aria-hidden="true"></i> {titulo}
        </p>
      )}
      {children}
    </div>
  );
}
