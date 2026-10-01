import { useRef } from 'react';
import type { ReactNode } from 'react';
import { useFocoPreso } from '../../services/constant/hook/use-foco-preso';

interface TelaCheiaProps {
  ativa: boolean;
  titulo: string;
  aoSair: () => void;
  children: ReactNode;
}

// Texto longo (termo de uso) cobrindo a tela inteira. Desligada, o conteúdo fica no lugar dele, sem desmontar: no
// Alterar Termo a caixa que se edita é a mesma dentro e fora, então texto e cursor continuam. "Sair" e Esc fecham
// só a tela cheia, não o modal por baixo.
export function TelaCheia({ ativa, titulo, aoSair, children }: TelaCheiaProps) {
  const ref = useRef<HTMLDivElement>(null);
  useFocoPreso(ref, ativa, aoSair);

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={ativa ? 'dialog' : undefined}
      aria-modal={ativa || undefined}
      aria-label={ativa ? titulo : undefined}
      className={ativa ? 'fixed inset-0 z-[210] fundo-cartao p-6 flex flex-col gap-3 outline-none' : 'contents'}
    >
      {ativa && (
        <div className="flex items-center justify-between gap-3">
          <p className="titulo-bloco">{titulo}</p>
          <button type="button" onClick={aoSair} className="btn-pilula">
            <i className="fa-solid fa-compress"></i> Sair da tela cheia (Esc)
          </button>
        </div>
      )}
      {children}
    </div>
  );
}
